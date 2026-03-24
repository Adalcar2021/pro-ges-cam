const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Dashboard principal - Obtener todos los datos
router.get('/', (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const mesInicio = new Date();
    mesInicio.setDate(1);
    const mesInicioStr = mesInicio.toISOString().split('T')[0];

    // Servicios de hoy
    const serviciosHoy = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) = ?
      ORDER BY s.fecha_programada ASC
    `).all(hoy);

    // Contadores de KPIs
    const serviciosProgramados = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE estado = ?').get('programado').count;
    const mantenimientosPendientes = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE tipo_servicio = ? AND estado = ?').get('mantenimiento', 'programado').count;
    const instalacionesProceso = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE tipo_servicio = ? AND estado = ?').get('instalacion', 'en_proceso').count;
    const cotizacionesAbiertas = db.prepare('SELECT COUNT(*) as count FROM cotizaciones WHERE estado IN (?, ?)').get('borrador', 'enviada').count;
    const repuestosBajoStock = db.prepare('SELECT COUNT(*) as count FROM repuestos WHERE stock_actual <= stock_minimo AND estado = ?').get('activo').count;
    const clientesActivos = db.prepare('SELECT COUNT(*) as count FROM clientes WHERE estado = ?').get('activo').count;

    // Últimos servicios realizados
    const ultimosServicios = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, s.tipo_servicio as tipo
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE s.estado = 'completado'
      ORDER BY s.fecha_realizacion DESC
      LIMIT 5
    `).all();

    // Ingresos del mes
    const ingresosMes = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM cotizaciones
      WHERE estado = 'aprobada' AND fecha_emision >= ?
    `).get(mesInicioStr).total;

    // Servicios por tipo (para gráfico)
    const serviciosPorTipo = db.prepare(`
      SELECT tipo_servicio, COUNT(*) as count
      FROM servicios
      WHERE estado = 'completado' AND fecha_realizacion >= ?
      GROUP BY tipo_servicio
    `).all(mesInicioStr);

    // Resumen de inventario
    const inventarioStats = db.prepare(`
      SELECT 
        COUNT(*) as total_productos,
        SUM(CASE WHEN stock_actual <= stock_minimo THEN 1 ELSE 0 END) as bajo_stock,
        SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) as agotados,
        COALESCE(SUM(stock_actual * costo_unitario), 0) as valor_total
      FROM repuestos
      WHERE estado = 'activo'
    `).get();

    res.json({
      kpis: {
        servicios_programados: serviciosHoy.length,
        mantenimientos_pendientes: mantenimientosPendientes,
        instalaciones_proceso: instalacionesProceso,
        cotizaciones_abiertas: cotizacionesAbiertas,
        repuestos_bajo_stock: repuestosBajoStock,
        clientes_activos: clientesActivos,
        ingresos_mes: ingresosMes,
        total_servicios: serviciosProgramados
      },
      servicios_hoy: serviciosHoy,
      ultimos_servicios: ultimosServicios,
      servicios_por_tipo: serviciosPorTipo,
      inventario: inventarioStats
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ error: 'Error al cargar dashboard' });
  }
});

// Agenda por fecha específica
router.get('/agenda', (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];

    const eventos = db.prepare(`
      SELECT s.id, s.codigo_servicio, s.tipo_servicio, s.fecha_programada, s.estado,
             s.duracion_estimada, c.nombre as cliente_nombre, c.direccion as cliente_direccion,
             c.telefono as cliente_telefono
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) = ?
      ORDER BY s.fecha_programada ASC
    `).all(fechaBusqueda);

    res.json({ fecha: fechaBusqueda, eventos });
  } catch (error) {
    console.error('Error en agenda:', error);
    res.status(500).json({ error: 'Error al cargar agenda' });
  }
});

// Agenda semanal
router.get('/agenda/semana', (req, res) => {
  try {
    const { fecha_inicio } = req.query;
    const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
    inicio.setDate(inicio.getDate() - inicio.getDay()); // Domingo
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);

    const eventos = db.prepare(`
      SELECT s.id, s.codigo_servicio, s.tipo_servicio, s.fecha_programada, s.estado,
             s.duracion_estimada, s.prioridad, c.nombre as cliente_nombre, 
             c.direccion as cliente_direccion, c.telefono as cliente_telefono
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) BETWEEN ? AND ?
      ORDER BY s.fecha_programada ASC
    `).all(inicio.toISOString().split('T')[0], fin.toISOString().split('T')[0]);

    // Agrupar por fecha
    const eventosPorDia = {};
    eventos.forEach(evento => {
      const fecha = evento.fecha_programada.split('T')[0];
      if (!eventosPorDia[fecha]) {
        eventosPorDia[fecha] = [];
      }
      eventosPorDia[fecha].push(evento);
    });

    res.json({ 
      semana: { inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0] },
      eventos: eventosPorDia 
    });
  } catch (error) {
    console.error('Error en agenda semanal:', error);
    res.status(500).json({ error: 'Error al cargar agenda semanal' });
  }
});

// Reportes y estadísticas
router.get('/reportes', (req, res) => {
  try {
    const { tipo, fecha_inicio, fecha_fin } = req.query;
    const inicio = fecha_inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const fin = fecha_fin || new Date().toISOString().split('T')[0];

    // Servicios por estado
    const serviciosPorEstado = db.prepare(`
      SELECT estado, COUNT(*) as count
      FROM servicios
      WHERE DATE(fecha_programada) BETWEEN ? AND ?
      GROUP BY estado
    `).all(inicio, fin);

    // Servicios por tipo
    const serviciosPorTipo = db.prepare(`
      SELECT tipo_servicio, COUNT(*) as count
      FROM servicios
      WHERE DATE(fecha_programada) BETWEEN ? AND ?
      GROUP BY tipo_servicio
    `).all(inicio, fin);

    // Ingresos por período
    const ingresosPorPeriodo = db.prepare(`
      SELECT 
        DATE(fecha_emision) as fecha,
        SUM(total) as total
      FROM cotizaciones
      WHERE estado = 'aprobada' AND DATE(fecha_emision) BETWEEN ? AND ?
      GROUP BY DATE(fecha_emision)
      ORDER BY fecha
    `).all(inicio, fin);

    // Top clientes por servicios
    const topClientes = db.prepare(`
      SELECT c.nombre, COUNT(s.id) as total_servicios
      FROM clientes c
      JOIN servicios s ON c.id = s.id_cliente
      WHERE DATE(s.fecha_programada) BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY total_servicios DESC
      LIMIT 10
    `).all(inicio, fin);

    res.json({
      periodo: { inicio, fin },
      por_estado: serviciosPorEstado,
      por_tipo: serviciosPorTipo,
      ingresos: ingresosPorPeriodo,
      top_clientes: topClientes
    });
  } catch (error) {
    console.error('Error en reportes:', error);
    res.status(500).json({ error: 'Error al generar reportes' });
  }
});

// Notificaciones
router.get('/notificaciones', (req, res) => {
  try {
    const notificaciones = [];

    // Servicios de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const serviciosHoy = db.prepare(`
      SELECT COUNT(*) as count FROM servicios 
      WHERE DATE(fecha_programada) = ? AND estado = 'programado'
    `).get(hoy).count;

    if (serviciosHoy > 0) {
      notificaciones.push({
        tipo: 'info',
        titulo: 'Servicios programados',
        mensaje: `Tienes ${serviciosHoy} servicios programados para hoy`,
        link: '/agenda'
      });
    }

    // Repuestos bajo stock
    const bajoStock = db.prepare('SELECT COUNT(*) as count FROM repuestos WHERE stock_actual <= stock_minimo AND estado = ?').get('activo').count;

    if (bajoStock > 0) {
      notificaciones.push({
        tipo: 'warning',
        titulo: 'Stock bajo',
        mensaje: `${bajoStock} productos tienen stock bajo`,
        link: '/inventario'
      });
    }

    // Cotizaciones pendientes
    const cotizacionesPendientes = db.prepare('SELECT COUNT(*) as count FROM cotizaciones WHERE estado = ?').get('enviada').count;

    if (cotizacionesPendientes > 0) {
      notificaciones.push({
        tipo: 'info',
        titulo: 'Cotizaciones pendientes',
        mensaje: `Tienes ${cotizacionesPendientes} cotizaciones esperando respuesta`,
        link: '/cotizaciones'
      });
    }

    res.json({ notificaciones });
  } catch (error) {
    console.error('Error en notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

module.exports = router;