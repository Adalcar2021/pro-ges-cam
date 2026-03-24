const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Generar código de servicio
const generarCodigo = () => {
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE codigo_servicio LIKE ?')
    .get(`SER-${year}%`).count + 1;
  return `SER-${year}-${count.toString().padStart(4, '0')}`;
};

// Listar servicios
router.get('/', (req, res) => {
  try {
    const { tipo, estado, fecha_inicio, fecha_fin, id_tecnico, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let query = `
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, 
             c.direccion as cliente_direccion, u.nombre_completo as tecnico_nombre
      FROM servicios s
      LEFT JOIN clientes c ON s.id_cliente = c.id
      LEFT JOIN usuarios u ON s.id_tecnico = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tipo) {
      query += ' AND s.tipo_servicio = ?';
      params.push(tipo);
    }
    if (estado) {
      query += ' AND s.estado = ?';
      params.push(estado);
    }
    if (fecha_inicio) {
      query += ' AND s.fecha_programada >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND s.fecha_programada <= ?';
      params.push(fecha_fin);
    }
    if (id_tecnico) {
      query += ' AND s.id_tecnico = ?';
      params.push(id_tecnico);
    }

    query += ' ORDER BY s.fecha_programada ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const servicios = db.prepare(query).all(...params);
    res.json({ servicios });
  } catch (error) {
    console.error('Error al listar servicios:', error);
    res.status(500).json({ error: 'Error al listar servicios' });
  }
});

// Servicios de hoy
router.get('/hoy', (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const servicios = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.direccion as cliente_direccion
      FROM servicios s
      LEFT JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) = ?
      ORDER BY s.fecha_programada ASC
    `).all(hoy);

    res.json({ servicios });
  } catch (error) {
    console.error('Error al obtener servicios de hoy:', error);
    res.status(500).json({ error: 'Error al obtener servicios de hoy' });
  }
});

// Obtener servicio por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const servicio = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.direccion as cliente_direccion, c.email as cliente_email,
             u.nombre_completo as tecnico_nombre
      FROM servicios s
      LEFT JOIN clientes c ON s.id_cliente = c.id
      LEFT JOIN usuarios u ON s.id_tecnico = u.id
      WHERE s.id = ?
    `).get(id);

    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ servicio });
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

// Crear servicio
router.post('/', (req, res) => {
  try {
    const {
      id_cliente, tipo_servicio, subtipo_mantenimiento, fecha_programada,
      duracion_estimada, direccion_servicio, sistema_instalado,
      cantidad_camaras, descripcion_trabajo, observaciones, prioridad
    } = req.body;

    if (!id_cliente || !tipo_servicio || !fecha_programada) {
      return res.status(400).json({ error: 'Cliente, tipo y fecha son requeridos' });
    }

    const codigo = generarCodigo();
    const id_tecnico = req.user.id;

    const result = db.prepare(`
      INSERT INTO servicios (
        codigo_servicio, id_cliente, id_tecnico, tipo_servicio,
        subtipo_mantenimiento, fecha_programada, duracion_estimada,
        direccion_servicio, sistema_instalado, cantidad_camaras,
        descripcion_trabajo, observaciones, prioridad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, id_cliente, id_tecnico, tipo_servicio,
      subtipo_mantenimiento, fecha_programada, duracion_estimada,
      direccion_servicio, sistema_instalado, cantidad_camaras,
      descripcion_trabajo, observaciones, prioridad || 'media'
    );

    const nuevoServicio = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre
      FROM servicios s
      LEFT JOIN clientes c ON s.id_cliente = c.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Servicio creado', servicio: nuevoServicio });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// Actualizar servicio
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo_servicio, subtipo_mantenimiento, fecha_programada, fecha_realizacion,
      duracion_estimada, duracion_real, estado, prioridad, direccion_servicio,
      sistema_instalado, cantidad_camaras, descripcion_trabajo, diagnostico,
      trabajo_realizado, observaciones, checklist_completo, cliente_instruido,
      firma_cliente, calificacion
    } = req.body;

    const existing = db.prepare('SELECT * FROM servicios WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    db.prepare(`
      UPDATE servicios SET
        tipo_servicio = ?, subtipo_mantenimiento = ?, fecha_programada = ?,
        fecha_realizacion = ?, duracion_estimada = ?, duracion_real = ?,
        estado = ?, prioridad = ?, direccion_servicio = ?, sistema_instalado = ?,
        cantidad_camaras = ?, descripcion_trabajo = ?, diagnostico = ?,
        trabajo_realizado = ?, observaciones = ?, checklist_completo = ?,
        cliente_instruido = ?, firma_cliente = ?, calificacion = ?
      WHERE id = ?
    `).run(
      tipo_servicio || existing.tipo_servicio,
      subtipo_mantenimiento || existing.subtipo_mantenimiento,
      fecha_programada || existing.fecha_programada,
      fecha_realizacion || existing.fecha_realizacion,
      duracion_estimada || existing.duracion_estimada,
      duracion_real || existing.duracion_real,
      estado || existing.estado,
      prioridad || existing.prioridad,
      direccion_servicio || existing.direccion_servicio,
      sistema_instalado || existing.sistema_instalado,
      cantidad_camaras || existing.cantidad_camaras,
      descripcion_trabajo || existing.descripcion_trabajo,
      diagnostico || existing.diagnostico,
      trabajo_realizado || existing.trabajo_realizado,
      observaciones || existing.observaciones,
      checklist_completo ? 1 : 0,
      cliente_instruido ? 1 : 0,
      firma_cliente || existing.firma_cliente,
      calificacion || existing.calificacion,
      id
    );
    
    const servicioActualizado = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre
      FROM servicios s
      LEFT JOIN clientes c ON s.id_cliente = c.id
      WHERE s.id = ?
    `).get(id);

    res.json({ message: 'Servicio actualizado', servicio: servicioActualizado });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// Eliminar servicio
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM servicios WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Eliminar materiales asociados
    db.prepare('DELETE FROM servicio_materiales WHERE id_servicio = ?').run(id);
    
    // Eliminar servicio
    db.prepare('DELETE FROM servicios WHERE id = ?').run(id);
    
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

module.exports = router;
