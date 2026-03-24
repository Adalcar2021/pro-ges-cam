const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Listar repuestos
router.get('/', (req, res) => {
  try {
    const { busqueda, categoria, estado, solo_bajo_stock, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let query = 'SELECT * FROM repuestos WHERE 1=1';
    const params = [];

    if (busqueda) {
      query += ' AND (nombre LIKE ? OR codigo_interno LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (solo_bajo_stock === 'true') {
      query += ' AND stock_actual <= stock_minimo';
    }

    query += ' ORDER BY nombre ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const repuestos = db.prepare(query).all(...params);

    // Agregar estado de stock a cada repuesto
    const repuestosConEstado = repuestos.map(r => {
      if (!r) return null;
      return {
        ...r,
        estado_stock: r.stock_actual === 0 ? 'agotado' : 
                      r.stock_actual <= r.stock_minimo ? 'bajo' : 'normal'
      };
    }).filter(r => r !== null);

    res.json({ repuestos: repuestosConEstado });
  } catch (error) {
    console.error('Error al listar inventario:', error);
    res.status(500).json({ error: 'Error al listar inventario' });
  }
});

// Obtener repuesto por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const repuesto = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);

    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    res.json({ repuesto });
  } catch (error) {
    console.error('Error al obtener repuesto:', error);
    res.status(500).json({ error: 'Error al obtener repuesto' });
  }
});

// Crear repuesto
router.post('/', (req, res) => {
  try {
    const {
      codigo_interno, codigo_proveedor, nombre, descripcion, categoria,
      marca, modelo, stock_actual, stock_minimo, stock_maximo,
      ubicacion_almacen, costo_unitario, precio_venta
    } = req.body;

    if (!codigo_interno || !nombre || !categoria) {
      return res.status(400).json({ error: 'Código, nombre y categoría son requeridos' });
    }

    // Verificar código único
    const existing = db.prepare('SELECT id FROM repuestos WHERE codigo_interno = ?').get(codigo_interno);
    if (existing) {
      return res.status(400).json({ error: 'El código interno ya existe' });
    }

    const result = db.prepare(`
      INSERT INTO repuestos (
        codigo_interno, codigo_proveedor, nombre, descripcion, categoria,
        marca, modelo, stock_actual, stock_minimo, stock_maximo,
        ubicacion_almacen, costo_unitario, precio_venta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo_interno, codigo_proveedor, nombre, descripcion, categoria,
      marca, modelo, stock_actual || 0, stock_minimo || 5, stock_maximo,
      ubicacion_almacen, costo_unitario, precio_venta
    );

    const nuevoRepuesto = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Repuesto creado', repuesto: nuevoRepuesto });
  } catch (error) {
    console.error('Error al crear repuesto:', error);
    res.status(500).json({ error: 'Error al crear repuesto' });
  }
});

// Actualizar repuesto
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_interno, codigo_proveedor, nombre, descripcion, categoria,
      marca, modelo, stock_actual, stock_minimo, stock_maximo,
      ubicacion_almacen, costo_unitario, precio_venta, estado
    } = req.body;

    const existing = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    db.prepare(`
      UPDATE repuestos SET
        codigo_interno = ?, codigo_proveedor = ?, nombre = ?, descripcion = ?,
        categoria = ?, marca = ?, modelo = ?, stock_actual = ?, stock_minimo = ?,
        stock_maximo = ?, ubicacion_almacen = ?, costo_unitario = ?, precio_venta = ?, estado = ?
      WHERE id = ?
    `).run(
      codigo_interno || existing.codigo_interno,
      codigo_proveedor || existing.codigo_proveedor,
      nombre || existing.nombre,
      descripcion || existing.descripcion,
      categoria || existing.categoria,
      marca || existing.marca,
      modelo || existing.modelo,
      stock_actual !== undefined ? stock_actual : existing.stock_actual,
      stock_minimo || existing.stock_minimo,
      stock_maximo || existing.stock_maximo,
      ubicacion_almacen || existing.ubicacion_almacen,
      costo_unitario || existing.costo_unitario,
      precio_venta || existing.precio_venta,
      estado || existing.estado,
      id
    );

    const repuestoActualizado = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    res.json({ message: 'Repuesto actualizado', repuesto: repuestoActualizado });
  } catch (error) {
    console.error('Error al actualizar repuesto:', error);
    res.status(500).json({ error: 'Error al actualizar repuesto' });
  }
});

// Descontar stock
router.post('/:id/descontar', (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, id_servicio } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Cantidad válida requerida' });
    }

    const repuesto = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    if (repuesto.stock_actual < cantidad) {
      return res.status(400).json({ 
        error: 'Stock insuficiente', 
        stock_actual: repuesto.stock_actual 
      });
    }

    db.prepare('UPDATE repuestos SET stock_actual = stock_actual - ? WHERE id = ?')
      .run(cantidad, id);

    // Registrar movimiento si hay servicio
    if (id_servicio) {
      db.prepare(`
        INSERT INTO servicio_materiales (id_servicio, id_repuesto, cantidad_usada, costo_unitario, total, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id_servicio, id, cantidad, repuesto.costo_unitario, cantidad * repuesto.costo_unitario, motivo);
    }

    const repuestoActualizado = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    res.json({ message: 'Stock descontado', repuesto: repuestoActualizado });
  } catch (error) {
    console.error('Error al descontar stock:', error);
    res.status(500).json({ error: 'Error al descontar stock' });
  }
});

// Aumentar stock
router.post('/:id/aumentar', (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, motivo } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Cantidad válida requerida' });
    }

    const repuesto = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    db.prepare('UPDATE repuestos SET stock_actual = stock_actual + ? WHERE id = ?')
      .run(cantidad, id);

    const repuestoActualizado = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    res.json({ message: 'Stock aumentado', repuesto: repuestoActualizado });
  } catch (error) {
    console.error('Error al aumentar stock:', error);
    res.status(500).json({ error: 'Error al aumentar stock' });
  }
});

// Eliminar repuesto
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    db.prepare('DELETE FROM repuestos WHERE id = ?').run(id);
    res.json({ message: 'Repuesto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    res.status(500).json({ error: 'Error al eliminar repuesto' });
  }
});

// Resumen de inventario
router.get('/resumen/stats', (req, res) => {
  try {
    const total_productos = db.prepare('SELECT COUNT(*) as count FROM repuestos WHERE estado = ?').get('activo').count;
    const bajo_stock = db.prepare('SELECT COUNT(*) as count FROM repuestos WHERE stock_actual <= stock_minimo AND estado = ?').get('activo').count;
    const agotados = db.prepare('SELECT COUNT(*) as count FROM repuestos WHERE stock_actual = 0 AND estado = ?').get('activo').count;
    const valor_total = db.prepare('SELECT SUM(stock_actual * costo_unitario) as total FROM repuestos WHERE estado = ?').get('activo').total;

    res.json({
      total_productos,
      bajo_stock,
      agotados,
      valor_total: valor_total || 0
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;