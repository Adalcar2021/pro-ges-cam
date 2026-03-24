const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Generar código de cotización
const generarCodigo = () => {
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as count FROM cotizaciones WHERE codigo_cotizacion LIKE ?')
    .get(`COT-${year}%`).count + 1;
  return `COT-${year}-${count.toString().padStart(4, '0')}`;
};

// Listar cotizaciones
router.get('/', (req, res) => {
  try {
    const { estado, id_cliente, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let query = `
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             u.nombre_completo as vendedor_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      JOIN usuarios u ON c.id_usuario_vendedor = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }

    if (id_cliente) {
      query += ' AND c.id_cliente = ?';
      params.push(id_cliente);
    }

    query += ' ORDER BY c.fecha_emision DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const cotizaciones = db.prepare(query).all(...params);
    res.json({ cotizaciones });
  } catch (error) {
    console.error('Error al listar cotizaciones:', error);
    res.status(500).json({ error: 'Error al listar cotizaciones' });
  }
});

// Obtener cotización por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             cl.direccion as cliente_direccion, cl.email as cliente_email,
             u.nombre_completo as vendedor_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      JOIN usuarios u ON c.id_usuario_vendedor = u.id
      WHERE c.id = ?
    `).get(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const detalles = db.prepare('SELECT * FROM cotizacion_detalles WHERE id_cotizacion = ?').all(id);

    res.json({ cotizacion, detalles });
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// Crear cotización
router.post('/', (req, res) => {
  try {
    const {
      id_cliente, fecha_validez, detalles,
      forma_pago, tiempo_entrega, garantia, notas
    } = req.body;

    if (!id_cliente || !detalles || detalles.length === 0) {
      return res.status(400).json({ error: 'Cliente y detalles son requeridos' });
    }

    const codigo = generarCodigo();
    const id_usuario_vendedor = req.user.id;

    // Calcular totales
    let subtotal = 0;
    detalles.forEach(d => {
      d.total = (d.cantidad * d.precio_unitario) - (d.descuento || 0);
      subtotal += d.total;
    });
    const iva = subtotal * 0.12;
    const total = subtotal + iva;

    // Insertar cotización
    const result = db.prepare(`
      INSERT INTO cotizaciones (
        codigo_cotizacion, id_cliente, id_usuario_vendedor, fecha_validez,
        subtotal, iva, total, forma_pago, tiempo_entrega, garantia, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, id_cliente, id_usuario_vendedor, fecha_validez,
      subtotal, iva, total, forma_pago, tiempo_entrega, garantia, notas
    );

    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO cotizacion_detalles (id_cotizacion, categoria, descripcion, cantidad, unidad, precio_unitario, descuento, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    detalles.forEach(d => {
      insertDetalle.run(result.lastInsertRowid, d.categoria, d.descripcion, d.cantidad, d.unidad || 'und', d.precio_unitario, d.descuento || 0, d.total);
    });

    const nuevaCotizacion = db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Cotización creada', cotizacion: nuevaCotizacion });
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

// Actualizar cotización
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { estado, forma_pago, tiempo_entrega, garantia, notas } = req.body;

    const existing = db.prepare('SELECT * FROM cotizaciones WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    db.prepare(`
      UPDATE cotizaciones SET
        estado = ?, forma_pago = ?, tiempo_entrega = ?, garantia = ?, notas = ?
      WHERE id = ?
    `).run(
      estado || existing.estado,
      forma_pago || existing.forma_pago,
      tiempo_entrega || existing.tiempo_entrega,
      garantia || existing.garantia,
      notas || existing.notas,
      id
    );

    const cotizacionActualizada = db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      WHERE c.id = ?
    `).get(id);

    res.json({ message: 'Cotización actualizada', cotizacion: cotizacionActualizada });
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// Convertir cotización a servicio
router.post('/:id/convertir', (req, res) => {
  try {
    const { id } = req.params;

    const cotizacion = db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.direccion as cliente_direccion
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      WHERE c.id = ?
    `).get(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Generar código de servicio
    const year = new Date().getFullYear();
    const count = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE codigo_servicio LIKE ?')
      .get(`SER-${year}%`).count + 1;
    const codigo_servicio = `SER-${year}-${count.toString().padStart(4, '0')}`;

    // Crear servicio desde cotización
    const result = db.prepare(`
      INSERT INTO servicios (
        codigo_servicio, id_cliente, id_tecnico, tipo_servicio,
        fecha_programada, direccion_servicio, descripcion_trabajo, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo_servicio, cotizacion.id_cliente, req.user.id, 'instalacion',
      new Date().toISOString(), cotizacion.cliente_direccion,
      `Servicio generado desde cotización ${cotizacion.codigo_cotizacion}`, 'programado'
    );

    // Actualizar cotización con referencia al servicio
    db.prepare('UPDATE cotizaciones SET id_servicio = ?, estado = ? WHERE id = ?')
      .run(result.lastInsertRowid, 'aprobada', id);

    const nuevoServicio = db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    res.json({ message: 'Cotización convertida a servicio', servicio: nuevoServicio });
  } catch (error) {
    console.error('Error al convertir cotización:', error);
    res.status(500).json({ error: 'Error al convertir cotización' });
  }
});

// Eliminar cotización
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM cotizaciones WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Eliminar detalles
    db.prepare('DELETE FROM cotizacion_detalles WHERE id_cotizacion = ?').run(id);
    
    // Eliminar cotización
    db.prepare('DELETE FROM cotizaciones WHERE id = ?').run(id);
    
    res.json({ message: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

module.exports = router;