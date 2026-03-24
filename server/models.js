/**
 * Modelos de Datos - CAMSEG
 * Sistema de Gestión de Seguridad Electrónica
 */

// Importar base de datos
const db = require('./database');

// ========================================
// MODELO USUARIOS
// ========================================

const Usuario = {
  // Obtener todos los usuarios
  getAll: (filtros = {}) => {
    let query = 'SELECT * FROM usuarios WHERE 1=1';
    const params = [];
    
    if (filtros.estado) {
      query += ' AND estado = ?';
      params.push(filtros.estado);
    }
    
    if (filtros.rol) {
      query += ' AND rol = ?';
      params.push(filtros.rol);
    }
    
    query += ' ORDER BY nombre_completo ASC';
    
    return db.prepare(query).all(...params);
  },
  
  // Obtener por ID
  getById: (id) => {
    return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  },
  
  // Obtener por usuario
  getByUsuario: (usuario) => {
    return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  },
  
  // Crear usuario
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO usuarios (nombre_completo, usuario, password, email, telefono, rol, estado)
      VALUES (@nombre_completo, @usuario, @password, @email, @telefono, @rol, @estado)
    `);
    
    return stmt.run(data);
  },
  
  // Actualizar usuario
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE usuarios SET
        nombre_completo = @nombre_completo,
        email = @email,
        telefono = @telefono,
        rol = @rol,
        estado = @estado
      WHERE id = @id
    `);
    
    return stmt.run({ id, ...data });
  },
  
  // Actualizar último acceso
  updateUltimoAcceso: (id) => {
    return db.prepare('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  },
  
  // Cambiar contraseña
  changePassword: (id, password) => {
    return db.prepare('UPDATE usuarios SET password = ? WHERE id = ?')
      .run(password, id);
  }
};

// ========================================
// MODELO CLIENTES
// ========================================

const Cliente = {
  // Obtener todos con filtros y paginación
  getAll: (opciones = {}) => {
    const { busqueda, tipo, estado, pagina = 1, limite = 20 } = opciones;
    const offset = (pagina - 1) * limite;
    
    let query = 'SELECT * FROM clientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (busqueda) {
      const term = `%${busqueda}%`;
      query += ' AND (nombre LIKE ? OR telefono LIKE ? OR documento LIKE ?)';
      countQuery += ' AND (nombre LIKE ? OR telefono LIKE ? OR documento LIKE ?)';
      params.push(term, term, term);
      countParams.push(term, term, term);
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
    params.push(limite, offset);
    
    const clientes = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams).total;
    
    return { clientes, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } };
  },
  
  // Obtener por ID
  getById: (id) => {
    return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  },
  
  // Obtener por documento
  getByDocumento: (documento) => {
    return db.prepare('SELECT * FROM clientes WHERE documento = ?').get(documento);
  },
  
  // Crear cliente
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO clientes (
        nombre, tipo_cliente, documento, razon_social, contacto_principal,
        telefono, telefono_alternativo, email, direccion, ciudad, departamento,
        latitud, longitud, referencia_direccion, observaciones, id_usuario_registro, estado
      ) VALUES (
        @nombre, @tipo_cliente, @documento, @razon_social, @contacto_principal,
        @telefono, @telefono_alternativo, @email, @direccion, @ciudad, @departamento,
        @latitud, @longitud, @referencia_direccion, @observaciones, @id_usuario_registro, @estado
      )
    `);
    
    return stmt.run(data);
  },
  
  // Actualizar cliente
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE clientes SET
        nombre = @nombre,
        tipo_cliente = @tipo_cliente,
        documento = @documento,
        razon_social = @razon_social,
        contacto_principal = @contacto_principal,
        telefono = @telefono,
        telefono_alternativo = @telefono_alternativo,
        email = @email,
        direccion = @direccion,
        ciudad = @ciudad,
        departamento = @departamento,
        latitud = @latitud,
        longitud = @longitud,
        referencia_direccion = @referencia_direccion,
        observaciones = @observaciones,
        estado = @estado
      WHERE id = @id
    `);
    
    return stmt.run({ id, ...data });
  },
  
  // Eliminar cliente
  delete: (id) => {
    return db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  },
  
  // Contar por estado
  countByEstado: (estado) => {
    return db.prepare('SELECT COUNT(*) as count FROM clientes WHERE estado = ?').get(estado).count;
  }
};

// ========================================
// MODELO SERVICIOS
// ========================================

const Servicio = {
  // Generar código de servicio
  generarCodigo: () => {
    const year = new Date().getFullYear();
    const count = db.prepare("SELECT COUNT(*) as count FROM servicios WHERE codigo_servicio LIKE ?")
      .get(`SER-${year}%`).count + 1;
    return `SER-${year}-${count.toString().padStart(4, '0')}`;
  },
  
  // Obtener todos con filtros
  getAll: (opciones = {}) => {
    const { tipo, estado, fecha_inicio, fecha_fin, id_tecnico, pagina = 1, limite = 20 } = opciones;
    const offset = (pagina - 1) * limite;
    
    let query = `
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, 
             c.direccion as cliente_direccion, u.nombre_completo as tecnico_nombre
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      JOIN usuarios u ON s.id_tecnico = u.id
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
    params.push(limite, offset);
    
    return db.prepare(query).all(...params);
  },
  
  // Obtener por ID
  getById: (id) => {
    return db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.direccion as cliente_direccion, c.email as cliente_email,
             u.nombre_completo as tecnico_nombre
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      JOIN usuarios u ON s.id_tecnico = u.id
      WHERE s.id = ?
    `).get(id);
  },
  
  // Obtener servicios de hoy
  getHoy: () => {
    const hoy = new Date().toISOString().split('T')[0];
    return db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.direccion as cliente_direccion
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) = ?
      ORDER BY s.fecha_programada ASC
    `).all(hoy);
  },
  
  // Obtener por fecha
  getByFecha: (fecha) => {
    return db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.direccion as cliente_direccion
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE DATE(s.fecha_programada) = ?
      ORDER BY s.fecha_programada ASC
    `).all(fecha);
  },
  
  // Crear servicio
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO servicios (
        codigo_servicio, id_cliente, id_tecnico, tipo_servicio,
        subtipo_mantenimiento, fecha_programada, duracion_estimada,
        direccion_servicio, sistema_instalado, cantidad_camaras,
        descripcion_trabajo, observaciones, prioridad, estado
      ) VALUES (
        @codigo_servicio, @id_cliente, @id_tecnico, @tipo_servicio,
        @subtipo_mantenimiento, @fecha_programada, @duracion_estimada,
        @direccion_servicio, @sistema_instalado, @cantidad_camaras,
        @descripcion_trabajo, @observaciones, @prioridad, @estado
      )
    `);
    
    return stmt.run(data);
  },
  
  // Actualizar servicio
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE servicios SET
        tipo_servicio = @tipo_servicio,
        subtipo_mantenimiento = @subtipo_mantenimiento,
        fecha_programada = @fecha_programada,
        fecha_realizacion = @fecha_realizacion,
        duracion_estimada = @duracion_estimada,
        duracion_real = @duracion_real,
        estado = @estado,
        prioridad = @prioridad,
        direccion_servicio = @direccion_servicio,
        sistema_instalado = @sistema_instalado,
        cantidad_camaras = @cantidad_camaras,
        descripcion_trabajo = @descripcion_trabajo,
        diagnostico = @diagnostico,
        trabajo_realizado = @trabajo_realizado,
        observaciones = @observaciones,
        checklist_completo = @checklist_completo,
        cliente_instruido = @cliente_instruido,
        firma_cliente = @firma_cliente,
        calificacion = @calificacion
      WHERE id = @id
    `);
    
    return stmt.run({ id, ...data });
  },
  
  // Eliminar servicio
  delete: (id) => {
    // Eliminar materiales asociados
    db.prepare('DELETE FROM servicio_materiales WHERE id_servicio = ?').run(id);
    return db.prepare('DELETE FROM servicios WHERE id = ?').run(id);
  },
  
  // Contar por estado
  countByEstado: (estado) => {
    return db.prepare('SELECT COUNT(*) as count FROM servicios WHERE estado = ?').get(estado).count;
  },
  
  // Contar por tipo y estado
  countByTipoEstado: (tipo, estado) => {
    return db.prepare('SELECT COUNT(*) as count FROM servicios WHERE tipo_servicio = ? AND estado = ?')
      .get(tipo, estado).count;
  },
  
  // Obtener últimos completados
  getUltimosCompletados: (limite = 5) => {
    return db.prepare(`
      SELECT s.*, c.nombre as cliente_nombre, s.tipo_servicio as tipo
      FROM servicios s
      JOIN clientes c ON s.id_cliente = c.id
      WHERE s.estado = 'completado'
      ORDER BY s.fecha_realizacion DESC
      LIMIT ?
    `).all(limite);
  }
};

// ========================================
// MODELO INVENTARIO/REPUESTOS
// ========================================

const Repuesto = {
  // Obtener todos con filtros
  getAll: (opciones = {}) => {
    const { busqueda, categoria, estado, solo_bajo_stock, pagina = 1, limite = 20 } = opciones;
    const offset = (pagina - 1) * limite;
    
    let query = 'SELECT * FROM repuestos WHERE 1=1';
    const params = [];
    
    if (busqueda) {
      const term = `%${busqueda}%`;
      query += ' AND (nombre LIKE ? OR codigo_interno LIKE ?)';
      params.push(term, term);
    }
    
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }
    
    if (solo_bajo_stock) {
      query += ' AND stock_actual <= stock_minimo';
    }
    
    query += ' ORDER BY nombre ASC LIMIT ? OFFSET ?';
    params.push(limite, offset);
    
    return db.prepare(query).all(...params);
  },
  
  // Obtener por ID
  getById: (id) => {
    return db.prepare('SELECT * FROM repuestos WHERE id = ?').get(id);
  },
  
  // Obtener por código
  getByCodigo: (codigo) => {
    return db.prepare('SELECT * FROM repuestos WHERE codigo_interno = ?').get(codigo);
  },
  
  // Crear repuesto
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO repuestos (
        codigo_interno, codigo_proveedor, nombre, descripcion, categoria,
        marca, modelo, stock_actual, stock_minimo, stock_maximo,
        ubicacion_almacen, costo_unitario, precio_venta, estado
      ) VALUES (
        @codigo_interno, @codigo_proveedor, @nombre, @descripcion, @categoria,
        @marca, @modelo, @stock_actual, @stock_minimo, @stock_maximo,
        @ubicacion_almacen, @costo_unitario, @precio_venta, @estado
      )
    `);
    
    return stmt.run(data);
  },
  
  // Actualizar repuesto
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE repuestos SET
        codigo_interno = @codigo_interno,
        codigo_proveedor = @codigo_proveedor,
        nombre = @nombre,
        descripcion = @descripcion,
        categoria = @categoria,
        marca = @marca,
        modelo = @modelo,
        stock_actual = @stock_actual,
        stock_minimo = @stock_minimo,
        stock_maximo = @stock_maximo,
        ubicacion_almacen = @ubicacion_almacen,
        costo_unitario = @costo_unitario,
        precio_venta = @precio_venta,
        estado = @estado
      WHERE id = @id
    `);
    
    return stmt.run({ id, ...data });
  },
  
  // Descontar stock
  descontarStock: (id, cantidad) => {
    return db.prepare('UPDATE repuestos SET stock_actual = stock_actual - ? WHERE id = ?')
      .run(cantidad, id);
  },
  
  // Aumentar stock
  aumentarStock: (id, cantidad) => {
    return db.prepare('UPDATE repuestos SET stock_actual = stock_actual + ? WHERE id = ?')
      .run(cantidad, id);
  },
  
  // Eliminar repuesto
  delete: (id) => {
    return db.prepare('DELETE FROM repuestos WHERE id = ?').run(id);
  },
  
  // Obtener estadísticas
  getStats: () => {
    return db.prepare(`
      SELECT 
        COUNT(*) as total_productos,
        SUM(CASE WHEN stock_actual <= stock_minimo THEN 1 ELSE 0 END) as bajo_stock,
        SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) as agotados,
        COALESCE(SUM(stock_actual * costo_unitario), 0) as valor_total
      FROM repuestos
      WHERE estado = 'activo'
    `).get();
  },
  
   // Obtener bajo stock
  getBajoStock: () => {
    return db.prepare('SELECT * FROM repuestos WHERE stock_actual <= stock_minimo AND estado = ? ORDER BY stock_actual ASC')
      .get('activo');
  }
};

// ========================================
// MODELO SERVICIO MATERIALES
// ========================================

const ServicioMaterial = {
  // Obtener por servicio
  getByServicio: (id_servicio) => {
    return db.prepare(`
      SELECT sm.*, r.nombre as repuesto_nombre, r.codigo_interno
      FROM servicio_materiales sm
      JOIN repuestos r ON sm.id_repuesto = r.id
      WHERE sm.id_servicio = ?
    `).all(id_servicio);
  },
  
  // Agregar material
  agregar: (data) => {
    const stmt = db.prepare(`
      INSERT INTO servicio_materiales (id_servicio, id_repuesto, cantidad_usada, costo_unitario, total, observaciones)
      VALUES (@id_servicio, @id_repuesto, @cantidad_usada, @costo_unitario, @total, @observaciones)
    `);
    
    return stmt.run(data);
  },
  
  // Eliminar
  eliminar: (id) => {
    return db.prepare('DELETE FROM servicio_materiales WHERE id = ?').run(id);
  }
};

// ========================================
// MODELO COTIZACIONES
// ========================================

const Cotizacion = {
  // Generar código
  generarCodigo: () => {
    const year = new Date().getFullYear();
    const count = db.prepare("SELECT COUNT(*) as count FROM cotizaciones WHERE codigo_cotizacion LIKE ?")
      .get(`COT-${year}%`).count + 1;
    return `COT-${year}-${count.toString().padStart(4, '0')}`;
  },
  
  // Obtener todas con filtros
  getAll: (opciones = {}) => {
    const { estado, id_cliente, pagina = 1, limite = 20 } = opciones;
    const offset = (pagina - 1) * limite;
    
    let query = `
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             u.nombre_completo as tecnico_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      JOIN usuarios u ON c.id_tecnico = u.id
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
    params.push(limite, offset);
    
    return db.prepare(query).all(...params);
  },
  
  // Obtener por ID
  getById: (id) => {
    return db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
             cl.direccion as cliente_direccion, cl.email as cliente_email,
             u.nombre_completo as tecnico_nombre
      FROM cotizaciones c
      JOIN clientes cl ON c.id_cliente = cl.id
      JOIN usuarios u ON c.id_tecnico = u.id
      WHERE c.id = ?
    `).get(id);
  },
  
  // Obtener detalles
  getDetalles: (id_cotizacion) => {
    return db.prepare('SELECT * FROM cotizacion_detalles WHERE id_cotizacion = ?')
      .all(id_cotizacion);
  },
  
  // Crear cotización
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO cotizaciones (
        codigo_cotizacion, id_cliente, id_tecnico, fecha_validez,
        subtotal, iva, total, forma_pago, tiempo_entrega, garantia, notas, estado
      ) VALUES (
        @codigo_cotizacion, @id_cliente, @id_tecnico, @fecha_validez,
        @subtotal, @iva, @total, @forma_pago, @tiempo_entrega, @garantia, @notas, @estado
      )
    `);
    
    return stmt.run(data);
  },
  
  // Agregar detalle
  agregarDetalle: (data) => {
    const stmt = db.prepare(`
      INSERT INTO cotizacion_detalles (id_cotizacion, categoria, descripcion, cantidad, unidad, precio_unitario, descuento, total)
      VALUES (@id_cotizacion, @categoria, @descripcion, @cantidad, @unidad, @precio_unitario, @descuento, @total)
    `);
    
    return stmt.run(data);
  },
  
  // Actualizar cotización
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE cotizaciones SET
        estado = @estado,
        forma_pago = @forma_pago,
        tiempo_entrega = @tiempo_entrega,
        garantia = @garantia,
        notas = @notas,
        id_servicio = @id_servicio
      WHERE id = @id
    `);
    
    return stmt.run({ id, ...data });
  },
  
  // Eliminar cotización
  delete: (id) => {
    // Eliminar detalles
    db.prepare('DELETE FROM cotizacion_detalles WHERE id_cotizacion = ?').run(id);
    return db.prepare('DELETE FROM cotizaciones WHERE id = ?').run(id);
  },
  
  // Contar por estado
  countByEstado: (estado) => {
    return db.prepare('SELECT COUNT(*) as count FROM cotizaciones WHERE estado = ?').get(estado).count;
  },
  
  // Obtener ingresos por período
  getIngresosPeriodo: (fecha_inicio, fecha_fin) => {
    return db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM cotizaciones
      WHERE estado = 'aprobada' AND fecha_emision BETWEEN ? AND ?
    `).get(fecha_inicio, fecha_fin).total;
  }
};

// ========================================
// MODELO MULTIMEDIA
// ========================================

const Multimedia = {
  // Obtener por entidad
  getByEntidad: (entidad_tipo, entidad_id) => {
    return db.prepare(`
      SELECT * FROM multimedia
      WHERE entidad_tipo = ? AND entidad_id = ?
      ORDER BY fecha_subida DESC
    `).all(entidad_tipo, entidad_id);
  },
  
  // Agregar archivo
  agregar: (data) => {
    const stmt = db.prepare(`
      INSERT INTO multimedia (entidad_tipo, entidad_id, tipo_archivo, categoria, nombre_archivo, ruta_archivo, tamano, mime_type, descripcion, id_usuario_subio)
      VALUES (@entidad_tipo, @entidad_id, @tipo_archivo, @categoria, @nombre_archivo, @ruta_archivo, @tamano, @mime_type, @descripcion, @id_usuario_subio)
    `);
    
    return stmt.run(data);
  },
  
  // Eliminar
  eliminar: (id) => {
    return db.prepare('DELETE FROM multimedia WHERE id = ?').run(id);
  }
};

// ========================================
// EXPORTAR MODELOS
// ========================================

module.exports = {
  Usuario,
  Cliente,
  Servicio,
  Repuesto,
  ServicioMaterial,
  Cotizacion,
  Multimedia
};