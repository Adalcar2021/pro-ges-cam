const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Generar número de factura
const generarNumeroFactura = () => {
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as count FROM ventas WHERE numero_factura LIKE ?')
    .get(`FAC-${year}%`).count + 1;
  return `FAC-${year}-${count.toString().padStart(4, '0')}`;
};

// Listar ventas
router.get('/', (req, res) => {
  try {
    const { estado, metodo_pago, fecha_inicio, fecha_fin, pagina = 1, limite = 20, search } = req.query;
    const offset = (pagina - 1) * limite;

    let query = `
      SELECT v.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             u.nombre_completo as vendedor_nombre
      FROM ventas v
      JOIN clientes cl ON v.id_cliente = cl.id
      JOIN usuarios u ON v.id_vendedor = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND v.estado = ?';
      params.push(estado);
    }

    if (metodo_pago) {
      query += ' AND v.metodo_pago = ?';
      params.push(metodo_pago);
    }

    if (fecha_inicio) {
      query += ' AND DATE(v.fecha_venta) >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND DATE(v.fecha_venta) <= ?';
      params.push(fecha_fin);
    }

    if (search) {
      query += ' AND (v.numero_factura LIKE ? OR cl.nombre LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY v.fecha_venta DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const ventas = db.prepare(query).all(...params);
    res.json({ ventas });
  } catch (error) {
    console.error('Error al listar ventas:', error);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
});

// Obtener estadísticas de ventas
router.get('/estadisticas', (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const mesAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const ventasHoy = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha_venta) = ? AND estado = 'pagada'
    `).get(hoy).total;

    const ventasSemana = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha_venta) >= ? AND estado = 'pagada'
    `).get(semanaAtras).total;

    const ventasMes = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha_venta) >= ? AND estado = 'pagada'
    `).get(mesAtras).total;

    const totalVentas = db.prepare(`
      SELECT COUNT(*) as total
      FROM ventas
    `).get().total;

    res.json({
      estadisticas: {
        ventas_hoy: ventasHoy,
        ventas_semana: ventasSemana,
        ventas_mes: ventasMes,
        total_ventas: totalVentas
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener venta por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const venta = db.prepare(`
      SELECT v.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             cl.direccion as cliente_direccion, cl.email as cliente_email,
             u.nombre_completo as vendedor_nombre
      FROM ventas v
      JOIN clientes cl ON v.id_cliente = cl.id
      JOIN usuarios u ON v.id_vendedor = u.id
      WHERE v.id = ?
    `).get(id);

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const detalles = db.prepare('SELECT * FROM venta_detalles WHERE id_venta = ?').all(id);

    res.json({ venta, detalles });
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

// Crear venta
router.post('/', (req, res) => {
  try {
    const {
      id_cliente, numero_factura, fecha_venta, metodo_pago, detalles,
      descuento_general, notas, pagos
    } = req.body;

    if (!id_cliente || !detalles || detalles.length === 0) {
      return res.status(400).json({ error: 'Cliente y detalles son requeridos' });
    }

    const numeroFactura = numero_factura || generarNumeroFactura();
    const id_vendedor = req.user.id;

    // Calcular totales
    let subtotal = 0;
    detalles.forEach(d => {
      d.subtotal = (d.cantidad * d.precio_unitario) - (d.descuento || 0);
      subtotal += d.subtotal;
    });
    
    const subtotalConDescuento = subtotal - (descuento_general || 0);
    const impuesto_valor = subtotalConDescuento * 0.12;
    const total = subtotalConDescuento + impuesto_valor;

    // Insertar venta
    const result = db.prepare(`
      INSERT INTO ventas (
        numero_factura, id_cliente, id_vendedor, fecha_venta, metodo_pago,
        subtotal, descuento_general, impuesto_valor, total, estado, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      numeroFactura, id_cliente, id_vendedor, fecha_venta, metodo_pago,
      subtotal, descuento_general || 0, impuesto_valor, total, 'pendiente', notas
    );

    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO venta_detalles (
        id_venta, id_repuesto, nombre_producto, descripcion, cantidad, 
        precio_unitario, descuento, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    detalles.forEach(d => {
      insertDetalle.run(
        result.lastInsertRowid, d.id_repuesto, d.nombre_producto, d.descripcion,
        d.cantidad, d.precio_unitario, d.descuento || 0, d.subtotal
      );
      
      // Descontar stock
      db.prepare(`
        UPDATE repuestos SET stock_actual = stock_actual - ?
        WHERE id = ? AND stock_actual >= ?
      `).run(d.cantidad, d.id_repuesto, d.cantidad);
    });

    // Insertar pagos si es mixto
    if (metodo_pago === 'mixto' && pagos) {
      const insertPago = db.prepare(`
        INSERT INTO venta_pagos (id_venta, metodo_pago, monto) VALUES (?, ?, ?)
      `);

      if (pagos.efectivo > 0) {
        insertPago.run(result.lastInsertRowid, 'efectivo', pagos.efectivo);
      }
      if (pagos.tarjeta > 0) {
        insertPago.run(result.lastInsertRowid, 'tarjeta', pagos.tarjeta);
      }
      if (pagos.transferencia > 0) {
        insertPago.run(result.lastInsertRowid, 'transferencia', pagos.transferencia);
      }
    }

    const nuevaVenta = db.prepare(`
      SELECT v.*, cl.nombre as cliente_nombre
      FROM ventas v
      JOIN clientes cl ON v.id_cliente = cl.id
      WHERE v.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Venta creada', venta: nuevaVenta });
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  }
});

// Actualizar venta
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;

    const existing = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    db.prepare(`
      UPDATE ventas SET
        estado = ?, notas = ?
      WHERE id = ?
    `).run(
      estado || existing.estado,
      notas || existing.notas,
      id
    );

    const ventaActualizada = db.prepare(`
      SELECT v.*, cl.nombre as cliente_nombre
      FROM ventas v
      JOIN clientes cl ON v.id_cliente = cl.id
      WHERE v.id = ?
    `).get(id);

    res.json({ message: 'Venta actualizada', venta: ventaActualizada });
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

// Eliminar venta
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // Devolver stock si está pendiente
    if (existing.estado === 'pendiente') {
      const detalles = db.prepare('SELECT * FROM venta_detalles WHERE id_venta = ?').all(id);
      detalles.forEach(detalle => {
        db.prepare(`
          UPDATE repuestos SET stock_actual = stock_actual + ?
          WHERE id = ?
        `).run(detalle.cantidad, detalle.id_repuesto);
      });
    }

    // Eliminar detalles
    db.prepare('DELETE FROM venta_detalles WHERE id_venta = ?').run(id);
    
    // Eliminar pagos
    db.prepare('DELETE FROM venta_pagos WHERE id_venta = ?').run(id);
    
    // Eliminar venta
    db.prepare('DELETE FROM ventas WHERE id = ?').run(id);
    
    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

module.exports = router;
