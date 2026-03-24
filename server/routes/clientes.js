const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Aplicar auth a todas las rutas
router.use(authenticateToken);

// Listar todos los clientes
router.get('/', (req, res) => {
  try {
    const { busqueda, tipo, estado, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let query = 'SELECT * FROM clientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
    const params = [];
    const countParams = [];

    if (busqueda) {
      query += ' AND (nombre LIKE ? OR telefono LIKE ? OR documento LIKE ?)';
      countQuery += ' AND (nombre LIKE ? OR telefono LIKE ? OR documento LIKE ?)';
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (tipo) {
      query += ' AND tipo_cliente = ?';
      countQuery += ' AND tipo_cliente = ?';
      params.push(tipo);
      countParams.push(tipo);
    }

    if (estado) {
      query += ' AND estado = ?';
      countQuery += ' AND estado = ?';
      params.push(estado);
      countParams.push(estado);
    }

    query += ' ORDER BY fecha_registro DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    // Ejecutar consultas con callbacks
    db.all(query, params, (err, clientes) => {
      if (err) {
        console.error('Error al listar clientes:', err);
        return res.status(500).json({ error: 'Error al listar clientes' });
      }

      db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
          console.error('Error al contar clientes:', err);
          return res.status(500).json({ error: 'Error al listar clientes' });
        }

        const total = countResult ? countResult.total : 0;

        res.json({
          clientes,
          paginacion: {
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            total,
            paginas: Math.ceil(total / limite)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al listar clientes' });
  }
});

// Obtener un cliente por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, cliente) => {
      if (err) {
        console.error('Error al obtener cliente:', err);
        return res.status(500).json({ error: 'Error al obtener cliente' });
      }

      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Obtener historial de servicios
      db.all(`
        SELECT s.*, u.nombre_completo as tecnico_nombre
        FROM servicios s
        JOIN usuarios u ON s.id_tecnico = u.id
        WHERE s.id_cliente = ?
        ORDER BY s.fecha_creacion DESC
        LIMIT 10
      `, [id], (err, servicios) => {
        if (err) {
          console.error('Error al obtener servicios:', err);
          servicios = [];
        }

        // Obtener cotizaciones
        db.all(`
          SELECT * FROM cotizaciones 
          WHERE id_cliente = ?
          ORDER BY fecha_emision DESC
          LIMIT 10
        `, [id], (err, cotizaciones) => {
          if (err) {
            console.error('Error al obtener cotizaciones:', err);
            cotizaciones = [];
          }

          res.json({
            cliente,
            servicios: servicios || [],
            cotizaciones: cotizaciones || []
          });
        });
      });
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// Crear nuevo cliente
router.post('/', (req, res) => {
  try {
    const {
      nombre,
      tipo_cliente = 'residencial',
      documento,
      razon_social,
      contacto_principal,
      telefono,
      telefono_alternativo,
      email,
      direccion,
      ciudad,
      departamento,
      latitud,
      longitud,
      referencia_direccion,
      observaciones
    } = req.body;

    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ 
        error: 'Nombre, teléfono y dirección son requeridos' 
      });
    }

    const sql = `
      INSERT INTO clientes (
        nombre, tipo_cliente, documento, razon_social, contacto_principal,
        telefono, telefono_alternativo, email, direccion, ciudad, departamento,
        latitud, longitud, referencia_direccion, observaciones, id_usuario_registro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      nombre, tipo_cliente, documento, razon_social, contacto_principal,
      telefono, telefono_alternativo, email, direccion, ciudad, departamento,
      latitud, longitud, referencia_direccion, observaciones, req.user.id
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error al crear cliente:', err);
        return res.status(500).json({ error: 'Error al crear cliente' });
      }

      // Obtener el cliente creado
      db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (err, cliente) => {
        if (err) {
          console.error('Error al obtener cliente creado:', err);
          return res.status(500).json({ error: 'Error al crear cliente' });
        }

        res.status(201).json({
          message: 'Cliente creado exitosamente',
          cliente
        });
      });
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      tipo_cliente,
      documento,
      razon_social,
      contacto_principal,
      telefono,
      telefono_alternativo,
      email,
      direccion,
      ciudad,
      departamento,
      latitud,
      longitud,
      referencia_direccion,
      observaciones,
      estado
    } = req.body;

    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ 
        error: 'Nombre, teléfono y dirección son requeridos' 
      });
    }

    const sql = `
      UPDATE clientes SET
        nombre = ?, tipo_cliente = ?, documento = ?, razon_social = ?,
        contacto_principal = ?, telefono = ?, telefono_alternativo = ?,
        email = ?, direccion = ?, ciudad = ?, departamento = ?,
        latitud = ?, longitud = ?, referencia_direccion = ?,
        observaciones = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      nombre, tipo_cliente, documento, razon_social, contacto_principal,
      telefono, telefono_alternativo, email, direccion, ciudad, departamento,
      latitud, longitud, referencia_direccion, observaciones, estado, id
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error al actualizar cliente:', err);
        return res.status(500).json({ error: 'Error al actualizar cliente' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Obtener el cliente actualizado
      db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, cliente) => {
        if (err) {
          console.error('Error al obtener cliente actualizado:', err);
          return res.status(500).json({ error: 'Error al actualizar cliente' });
        }

        res.json({
          message: 'Cliente actualizado exitosamente',
          cliente
        });
      });
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente (cambiar estado a inactivo)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.run('UPDATE clientes SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['inactivo', id], function(err) {
      if (err) {
        console.error('Error al eliminar cliente:', err);
        return res.status(500).json({ error: 'Error al eliminar cliente' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ message: 'Cliente eliminado exitosamente' });
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
