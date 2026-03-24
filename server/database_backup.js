/**
 * Base de Datos - CAMSEG
 * Sistema de Gestión de Seguridad Electrónica
 * Usando sql.js (JavaScript puro, sin binarios nativos)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Ruta de la base de datos
const dbPath = path.join(__dirname, 'camseg.db');

let SQL;
let db;

// Crear un objeto proxy que simule la interfaz de better-sqlite3
// ========================================
// CREACIÓN DE TABLAS
// ========================================


const createTables = () => {
  if (!db) throw new Error('Database no inicializada');
  db.exec(`
    -- ========================================
    -- TABLA DE USUARIOS
    -- ========================================
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      rol TEXT DEFAULT 'tecnico',
      estado TEXT DEFAULT 'activo',
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso DATETIME,
      foto_perfil TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- TABLA DE CLIENTES
    -- ========================================
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo_cliente TEXT DEFAULT 'residencial',
      documento TEXT,
      razon_social TEXT,
      contacto_principal TEXT,
      telefono TEXT NOT NULL,
      telefono_alternativo TEXT,
      email TEXT,
      direccion TEXT NOT NULL,
      ciudad TEXT,
      departamento TEXT,
      latitud REAL,
      longitud REAL,
      referencia_direccion TEXT,
      observaciones TEXT,
      estado TEXT DEFAULT 'activo',
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_usuario_registro INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario_registro) REFERENCES usuarios(id)
    );

    -- ========================================
    -- TABLA DE SERVICIOS
    -- ========================================
    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_servicio TEXT UNIQUE NOT NULL,
      id_cliente INTEGER NOT NULL,
      id_tecnico INTEGER NOT NULL,
      tipo_servicio TEXT NOT NULL,
      subtipo_mantenimiento TEXT,
      fecha_programada DATETIME NOT NULL,
      fecha_realizacion DATETIME,
      duracion_estimada INTEGER,
      duracion_real INTEGER,
      estado TEXT DEFAULT 'programado',
      prioridad TEXT DEFAULT 'media',
      direccion_servicio TEXT,
      sistema_instalado TEXT,
      cantidad_camaras INTEGER DEFAULT 0,
      descripcion_trabajo TEXT,
      diagnostico TEXT,
      trabajo_realizado TEXT,
      observaciones TEXT,
      checklist_completo INTEGER DEFAULT 0,
      cliente_instruido INTEGER DEFAULT 0,
      firma_cliente TEXT,
      calificacion INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_cliente) REFERENCES clientes(id),
      FOREIGN KEY (id_tecnico) REFERENCES usuarios(id)
    );

    -- ========================================
    -- TABLA DE REPUESTOS/INVENTARIO
    -- ========================================
    CREATE TABLE IF NOT EXISTS repuestos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_interno TEXT UNIQUE NOT NULL,
      codigo_proveedor TEXT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT NOT NULL,
      marca TEXT,
      modelo TEXT,
      stock_actual INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 5,
      stock_maximo INTEGER,
      ubicacion_almacen TEXT,
      costo_unitario REAL DEFAULT 0,
      precio_venta REAL DEFAULT 0,
      estado TEXT DEFAULT 'activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- TABLA DE MATERIALES USADOS EN SERVICIOS
    -- ========================================
    CREATE TABLE IF NOT EXISTS servicio_materiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_servicio INTEGER NOT NULL,
      id_repuesto INTEGER NOT NULL,
      cantidad_usada REAL NOT NULL,
      costo_unitario REAL,
      total REAL,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_servicio) REFERENCES servicios(id),
      FOREIGN KEY (id_repuesto) REFERENCES repuestos(id)
    );

    -- ========================================
    -- TABLA DE COTIZACIONES
    -- ========================================
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_cotizacion TEXT UNIQUE NOT NULL,
      id_cliente INTEGER NOT NULL,
      id_tecnico INTEGER NOT NULL,
      id_servicio INTEGER,
      fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_validez DATE,
      subtotal REAL NOT NULL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      estado TEXT DEFAULT 'borrador',
      forma_pago TEXT,
      tiempo_entrega TEXT,
      garantia TEXT,
      notas TEXT,
      pdf_generado TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_cliente) REFERENCES clientes(id),
      FOREIGN KEY (id_tecnico) REFERENCES usuarios(id),
      FOREIGN KEY (id_servicio) REFERENCES servicios(id)
    );

    -- ========================================
    -- TABLA DE DETALLES DE COTIZACIONES
    -- ========================================
    CREATE TABLE IF NOT EXISTS cotizacion_detalles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cotizacion INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL,
      unidad TEXT DEFAULT 'und',
      precio_unitario REAL NOT NULL,
      descuento REAL DEFAULT 0,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id)
    );

    -- ========================================
    -- TABLA DE MULTIMEDIA
    -- ========================================
    CREATE TABLE IF NOT EXISTS multimedia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entidad_tipo TEXT NOT NULL,
      entidad_id INTEGER NOT NULL,
      tipo_archivo TEXT NOT NULL,
      categoria TEXT NOT NULL,
      nombre_archivo TEXT NOT NULL,
      ruta_archivo TEXT NOT NULL,
      tamano INTEGER,
      mime_type TEXT,
      descripcion TEXT,
      fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_usuario_subio INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario_subio) REFERENCES usuarios(id)
    );

    -- ========================================
    -- TABLA DE NOTIFICACIONES
    -- ========================================
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      mensaje TEXT,
      tipo TEXT DEFAULT 'info',
      leido INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- ========================================
    -- TABLA DE LOGS/AUDITORÍA
    -- ========================================
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      accion TEXT NOT NULL,
      entidad TEXT,
      entidad_id INTEGER,
      detalles TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- ========================================
    -- ÍNDICES
    -- ========================================
    CREATE INDEX IF NOT EXISTS idx_servicios_fecha ON servicios(fecha_programada);
    CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);
    CREATE INDEX IF NOT EXISTS idx_servicios_cliente ON servicios(id_cliente);
    CREATE INDEX IF NOT EXISTS idx_servicios_tecnico ON servicios(id_tecnico);
    CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
    CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
    CREATE INDEX IF NOT EXISTS idx_repuestos_codigo ON repuestos(codigo_interno);
    CREATE INDEX IF NOT EXISTS idx_repuestos_categoria ON repuestos(categoria);
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(id_cliente);
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
    CREATE INDEX IF NOT EXISTS idx_multimedia_entidad ON multimedia(entidad_tipo, entidad_id);
  `);
};

// ========================================
// SEED DATA - DATOS DE PRUEBA
// ========================================

const seedDatabase = () => {
  try {
    // Verificar si ya hay usuarios
    const userExists = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    console.log('🔍 Usuarios existentes:', userExists.count);
    
    if (userExists.count === 0) {
      console.log('📦 Insertando datos de prueba...');
      
      // Crear usuarios
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      console.log('🔐 Contraseña hasheada:', hashedPassword.substring(0, 20) + '...');
      
      const usuarios = [
        {
          nombre_completo: 'Adalberto Cárdenas',
          usuario: 'adalberto',
          password: hashedPassword,
          email: 'adalberto@camseg.com',
          telefono: '555-1234',
          rol: 'admin'
        },
        {
          nombre_completo: 'Juan Pérez',
          usuario: 'juanp',
          password: hashedPassword,
          email: 'juan@camseg.com',
          telefono: '555-5678',
          rol: 'tecnico'
        },
        {
          nombre_completo: 'María García',
          usuario: 'mariag',
          password: hashedPassword,
          email: 'maria@camseg.com',
          telefono: '555-9012',
          rol: 'tecnico'
        }
      ];
      
      const insertUsuario = db.prepare(`
        INSERT INTO usuarios (nombre_completo, usuario, password, email, telefono, rol)
        VALUES (@nombre_completo, @usuario, @password, @email, @telefono, @rol)
      `);
      
      usuarios.forEach(u => {
        try {
          insertUsuario.run(u);
          console.log(`👥 Usuario creado: ${u.nombre_completo}`);
        } catch (error) {
          console.error(`🚫 Error creando usuario: ${u.nombre_completo}`, error);
        }
      });
      
      // Crear clientes
      const clientes = [
        {
          nombre: 'María García',
          tipo_cliente: 'residencial',
          telefono: '555-1111',
          email: 'maria.garcia@email.com',
          direccion: 'Av. Principal 123',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Pedro Martínez',
          tipo_cliente: 'residencial',
          telefono: '555-2222',
          email: 'pedro.martinez@email.com',
          direccion: 'Calle 5 #12-34',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Empresa Rodriguez SAC',
          tipo_cliente: 'empresa',
          telefono: '555-3333',
          email: 'contacto@rodriguez.com',
          direccion: 'Av. Industrial 456',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Ana López',
          tipo_cliente: 'residencial',
          telefono: '555-4444',
          email: 'ana.lopez@email.com',
          direccion: 'Jr. Sol 789',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Tech Solutions',
          tipo_cliente: 'empresa',
          telefono: '555-5555',
          email: 'admin@techsolutions.com',
          direccion: 'Of. 302 Centro Comercial',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Carlos Ramírez',
          tipo_cliente: 'residencial',
          telefono: '555-6666',
          email: 'carlos.ramirez@email.com',
          direccion: 'Av. Libertador 234',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Supermercado La Favorita',
          tipo_cliente: 'empresa',
          telefono: '555-7777',
          email: 'gerencia@lafavorita.com',
          direccion: ' Blvd. Comercial 890',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'activo'
        },
        {
          nombre: 'Laura Flores',
          tipo_cliente: 'residencial',
          telefono: '555-8888',
          email: 'laura.flores@email.com',
          direccion: 'Calle 10 #45-67',
          ciudad: 'Ciudad Central',
          departamento: 'Central',
          estado: 'prospecto'
        }
      ];
      
      const insertCliente = db.prepare(`
        INSERT INTO clientes (nombre, tipo_cliente, telefono, email, direccion, ciudad, departamento, estado, id_usuario_registro)
        VALUES (@nombre, @tipo_cliente, @telefono, @email, @direccion, @ciudad, @departamento, @estado, 1)
      `);
      
      clientes.forEach(c => insertCliente.run(c));
      
      // Crear repuestos
      const repuestos = [
        { codigo_interno: 'CAM-DOMO-02', nombre: 'Cámara Domo 2MP', categoria: 'camaras', marca: 'Hikvision', stock_actual: 12, stock_minimo: 5, costo: 35, precio: 45 },
        { codigo_interno: 'CAM-DOMO-04', nombre: 'Cámara Domo 4MP', categoria: 'camaras', marca: 'Hikvision', stock_actual: 8, stock_minimo: 5, costo: 50, precio: 65 },
        { codigo_interno: 'CAM-BUL-01', nombre: 'Cámara Bullet 2MP', categoria: 'camaras', marca: 'Dahua', stock_actual: 5, stock_minimo: 5, costo: 42, precio: 55 },
        { codigo_interno: 'CAM-BUL-02', nombre: 'Cámara Bullet 4MP', categoria: 'camaras', marca: 'Dahua', stock_actual: 3, stock_minimo: 5, costo: 58, precio: 75 },
        { codigo_interno: 'CAM-PTZ-01', nombre: 'Cámara PTZ 20X', categoria: 'camaras', marca: 'Hikvision', stock_actual: 2, stock_minimo: 2, costo: 150, precio: 195 },
        { codigo_interno: 'DVR-04CH', nombre: 'DVR 4 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 6, stock_minimo: 3, costo: 75, precio: 95 },
        { codigo_interno: 'DVR-08CH', nombre: 'DVR 8 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 4, stock_minimo: 3, costo: 95, precio: 120 },
        { codigo_interno: 'DVR-16CH', nombre: 'DVR 16 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 2, stock_minimo: 2, costo: 145, precio: 180 },
        { codigo_interno: 'NVR-08CH', nombre: 'NVR 8 canales IP', categoria: 'dvr', marca: 'Hikvision', stock_actual: 3, stock_minimo: 2, costo: 120, precio: 155 },
        { codigo_interno: 'NVR-16CH', nombre: 'NVR 16 canales IP', categoria: 'dvr', marca: 'Hikvision', stock_actual: 1, stock_minimo: 2, costo: 180, precio: 230 },
        { codigo_interno: 'HDD-1TB', nombre: 'Disco Duro 1TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 0, stock_minimo: 5, costo: 55, precio: 70 },
        { codigo_interno: 'HDD-2TB', nombre: 'Disco Duro 2TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 4, stock_minimo: 5, costo: 75, precio: 95 },
        { codigo_interno: 'HDD-4TB', nombre: 'Disco Duro 4TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 6, stock_minimo: 3, costo: 110, precio: 140 },
        { codigo_interno: 'HDD-6TB', nombre: 'Disco Duro 6TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 2, stock_minimo: 2, costo: 160, precio: 200 },
        { codigo_interno: 'PWR-12V1A', nombre: 'Fuente 12V 1A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 30, stock_minimo: 10, costo: 8, precio: 12 },
        { codigo_interno: 'PWR-12V2A', nombre: 'Fuente 12V 2A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 25, stock_minimo: 10, costo: 10, precio: 15 },
        { codigo_interno: 'PWR-12V5A', nombre: 'Fuente 12V 5A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 10, stock_minimo: 5, costo: 18, precio: 25 },
        { codigo_interno: 'PWR-24V', nombre: 'Fuente 24V', categoria: 'fuentes', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 22, precio: 30 },
        { codigo_interno: 'UPS-500', nombre: 'UPS 500VA', categoria: 'fuentes', marca: 'APC', stock_actual: 3, stock_minimo: 2, costo: 65, precio: 85 },
        { codigo_interno: 'UPS-1000', nombre: 'UPS 1000VA', categoria: 'fuentes', marca: 'APC', stock_actual: 2, stock_minimo: 2, costo: 120, precio: 155 },
        { codigo_interno: 'CAB-CAT6-BLU', nombre: 'Cable Cat6 Azul (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 500, stock_minimo: 100, costo: 1, precio: 1.50 },
        { codigo_interno: 'CAB-CAT6-BLK', nombre: 'Cable Cat6 Negro (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 300, stock_minimo: 100, costo: 1, precio: 1.50 },
        { codigo_interno: 'CAB-COAX', nombre: 'Cable Coaxial RG59 (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 200, stock_minimo: 50, costo: 0.80, precio: 1.20 },
        { codigo_interno: 'CAB-POWER', nombre: 'Cable Poder DC (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 150, stock_minimo: 50, costo: 0.60, precio: 1 },
        { codigo_interno: 'CON-RG59', nombre: 'Conector RG59', categoria: 'conectores', marca: 'Genérico', stock_actual: 100, stock_minimo: 20, costo: 0.30, precio: 0.50 },
        { codigo_interno: 'CON-BNC', nombre: 'Conector BNC', categoria: 'conectores', marca: 'Genérico', stock_actual: 80, stock_minimo: 20, costo: 0.25, precio: 0.45 },
        { codigo_interno: 'CON-RJ45', nombre: 'Conector RJ45', categoria: 'conectores', marca: 'Genérico', stock_actual: 150, stock_minimo: 30, costo: 0.20, precio: 0.40 },
        { codigo_interno: 'CON-DC', nombre: 'Conector DC Macho', categoria: 'conectores', marca: 'Genérico', stock_actual: 60, stock_minimo: 15, costo: 0.35, precio: 0.60 },
        { codigo_interno: 'FUS-12V', nombre: 'Fusible 12V', categoria: 'accesorios', marca: 'Genérico', stock_actual: 50, stock_minimo: 10, costo: 0.15, precio: 0.30 },
        { codigo_interno: 'TOR-12V', nombre: 'Tornillos 12mm', categoria: 'accesorios', marca: 'Genérico', stock_actual: 200, stock_minimo: 50, costo: 0.05, precio: 0.10 },
        { codigo_interno: 'TUB-COR', nombre: 'Tubo Corrugado 3/4"', categoria: 'accesorios', marca: 'Genérico', stock_actual: 30, stock_minimo: 10, costo: 1.50, precio: 2.50 },
        { codigo_interno: 'CAJ-EXTER', nombre: 'Caja Exterior CCTV', categoria: 'accesorios', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 12, precio: 18 },
        { codigo_interno: 'CAJ-INTER', nombre: 'Caja Interior', categoria: 'accesorios', marca: 'Genérico', stock_actual: 15, stock_minimo: 5, costo: 8, precio: 12 },
        { codigo_interno: 'SOP-PARED', nombre: 'Soporte de Pared', categoria: 'accesorios', marca: 'Genérico', stock_actual: 20, stock_minimo: 5, costo: 10, precio: 15 },
        { codigo_interno: 'SOP-TECHO', nombre: 'Soporte de Techo', categoria: 'accesorios', marca: 'Genérico', stock_actual: 12, stock_minimo: 3, costo: 12, precio: 18 },
        { codigo_interno: 'MOUSE-PS2', nombre: 'Mouse USB', categoria: 'accesorios', marca: 'Genérico', stock_actual: 10, stock_minimo: 3, costo: 5, precio: 8 },
        { codigo_interno: 'TECLADO-USB', nombre: 'Teclado USB', categoria: 'accesorios', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 8, precio: 12 },
        { codigo_interno: 'CABLE-HDMI', nombre: 'Cable HDMI 1.5m', categoria: 'accesorios', marca: 'Genérico', stock_actual: 15, stock_minimo: 5, costo: 6, precio: 10 },
        { codigo_interno: 'USB-WIFI', nombre: 'Adaptador WiFi USB', categoria: 'accesorios', marca: 'TP-Link', stock_actual: 5, stock_minimo: 2, costo: 15, precio: 22 },
        { codigo_interno: 'SWITCH-4P', nombre: 'Switch 4 Puertos', categoria: 'red', marca: 'TP-Link', stock_actual: 8, stock_minimo: 3, costo: 18, precio: 25 },
        { codigo_interno: 'SWITCH-8P', nombre: 'Switch 8 Puertos', categoria: 'red', marca: 'TP-Link', stock_actual: 5, stock_minimo: 2, costo: 28, precio: 38 }
      ];
      
      const insertRepuesto = db.prepare(`
        INSERT INTO repuestos (codigo_interno, nombre, categoria, marca, stock_actual, stock_minimo, costo_unitario, precio_venta, estado)
        VALUES (@codigo_interno, @nombre, @categoria, @marca, @stock_actual, @stock_minimo, @costo, @precio, 'activo')
      `);
      
      repuestos.forEach(r => insertRepuesto.run(r));
      
      // Crear servicios de ejemplo
      const hoy = new Date();
      const servicios = [
        {
          tipo_servicio: 'instalacion',
          fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 8, 0).toISOString(),
          estado: 'programado',
          id_cliente: 1,
          prioridad: 'alta',
          sistema_instalado: 'CCTV 4 cámaras',
          cantidad_camaras: 4
        },
        {
          tipo_servicio: 'mantenimiento',
          fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 30).toISOString(),
          estado: 'programado',
          id_cliente: 3,
          prioridad: 'media',
          sistema_instalado: 'Sistema CCTV',
          cantidad_camaras: 8
        },
        {
          tipo_servicio: 'revision',
          fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0).toISOString(),
          estado: 'programado',
          id_cliente: 2,
          prioridad: 'baja',
          sistema_instalado: 'CCTV Domo',
          cantidad_camaras: 2
        },
        {
          tipo_servicio: 'mantenimiento',
        telefono: '555-5678',
        rol: 'tecnico'
      },
      {
        nombre_completo: 'María García',
        usuario: 'mariag',
        password: hashedPassword,
        email: 'maria@camseg.com',
        telefono: '555-9012',
        rol: 'tecnico'
      }
    ];
    
    const insertUsuario = db.prepare(`
      INSERT INTO usuarios (nombre_completo, usuario, password, email, telefono, rol)
      VALUES (@nombre_completo, @usuario, @password, @email, @telefono, @rol)
    `);
    
    usuarios.forEach(u => insertUsuario.run(u));
    
    // Crear clientes
    const clientes = [
      {
        nombre: 'María García',
        tipo_cliente: 'residencial',
        telefono: '555-1111',
        email: 'maria.garcia@email.com',
        direccion: 'Av. Principal 123',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Pedro Martínez',
        tipo_cliente: 'residencial',
        telefono: '555-2222',
        email: 'pedro.martinez@email.com',
        direccion: 'Calle 5 #12-34',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Empresa Rodriguez SAC',
        tipo_cliente: 'empresa',
        telefono: '555-3333',
        email: 'contacto@rodriguez.com',
        direccion: 'Av. Industrial 456',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Ana López',
        tipo_cliente: 'residencial',
        telefono: '555-4444',
        email: 'ana.lopez@email.com',
        direccion: 'Jr. Sol 789',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Tech Solutions',
        tipo_cliente: 'empresa',
        telefono: '555-5555',
        email: 'admin@techsolutions.com',
        direccion: 'Of. 302 Centro Comercial',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Carlos Ramírez',
        tipo_cliente: 'residencial',
        telefono: '555-6666',
        email: 'carlos.ramirez@email.com',
        direccion: 'Av. Libertador 234',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Supermercado La Favorita',
        tipo_cliente: 'empresa',
        telefono: '555-7777',
        email: 'gerencia@lafavorita.com',
        direccion: ' Blvd. Comercial 890',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'activo'
      },
      {
        nombre: 'Laura Flores',
        tipo_cliente: 'residencial',
        telefono: '555-8888',
        email: 'laura.flores@email.com',
        direccion: 'Calle 10 #45-67',
        ciudad: 'Ciudad Central',
        departamento: 'Central',
        estado: 'prospecto'
      }
    ];
    
    const insertCliente = db.prepare(`
      INSERT INTO clientes (nombre, tipo_cliente, telefono, email, direccion, ciudad, departamento, estado, id_usuario_registro)
      VALUES (@nombre, @tipo_cliente, @telefono, @email, @direccion, @ciudad, @departamento, @estado, 1)
    `);
    
    clientes.forEach(c => insertCliente.run(c));
    
    // Crear repuestos
    const repuestos = [
      { codigo_interno: 'CAM-DOMO-02', nombre: 'Cámara Domo 2MP', categoria: 'camaras', marca: 'Hikvision', stock_actual: 12, stock_minimo: 5, costo: 35, precio: 45 },
      { codigo_interno: 'CAM-DOMO-04', nombre: 'Cámara Domo 4MP', categoria: 'camaras', marca: 'Hikvision', stock_actual: 8, stock_minimo: 5, costo: 50, precio: 65 },
      { codigo_interno: 'CAM-BUL-01', nombre: 'Cámara Bullet 2MP', categoria: 'camaras', marca: 'Dahua', stock_actual: 5, stock_minimo: 5, costo: 42, precio: 55 },
      { codigo_interno: 'CAM-BUL-02', nombre: 'Cámara Bullet 4MP', categoria: 'camaras', marca: 'Dahua', stock_actual: 3, stock_minimo: 5, costo: 58, precio: 75 },
      { codigo_interno: 'CAM-PTZ-01', nombre: 'Cámara PTZ 20X', categoria: 'camaras', marca: 'Hikvision', stock_actual: 2, stock_minimo: 2, costo: 150, precio: 195 },
      { codigo_interno: 'DVR-04CH', nombre: 'DVR 4 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 6, stock_minimo: 3, costo: 75, precio: 95 },
      { codigo_interno: 'DVR-08CH', nombre: 'DVR 8 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 4, stock_minimo: 3, costo: 95, precio: 120 },
      { codigo_interno: 'DVR-16CH', nombre: 'DVR 16 canales', categoria: 'dvr', marca: 'Hikvision', stock_actual: 2, stock_minimo: 2, costo: 145, precio: 180 },
      { codigo_interno: 'NVR-08CH', nombre: 'NVR 8 canales IP', categoria: 'dvr', marca: 'Hikvision', stock_actual: 3, stock_minimo: 2, costo: 120, precio: 155 },
      { codigo_interno: 'NVR-16CH', nombre: 'NVR 16 canales IP', categoria: 'dvr', marca: 'Hikvision', stock_actual: 1, stock_minimo: 2, costo: 180, precio: 230 },
      { codigo_interno: 'HDD-1TB', nombre: 'Disco Duro 1TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 0, stock_minimo: 5, costo: 55, precio: 70 },
      { codigo_interno: 'HDD-2TB', nombre: 'Disco Duro 2TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 4, stock_minimo: 5, costo: 75, precio: 95 },
      { codigo_interno: 'HDD-4TB', nombre: 'Disco Duro 4TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 6, stock_minimo: 3, costo: 110, precio: 140 },
      { codigo_interno: 'HDD-6TB', nombre: 'Disco Duro 6TB', categoria: 'discos', marca: 'Western Digital', stock_actual: 2, stock_minimo: 2, costo: 160, precio: 200 },
      { codigo_interno: 'PWR-12V1A', nombre: 'Fuente 12V 1A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 30, stock_minimo: 10, costo: 8, precio: 12 },
      { codigo_interno: 'PWR-12V2A', nombre: 'Fuente 12V 2A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 25, stock_minimo: 10, costo: 10, precio: 15 },
      { codigo_interno: 'PWR-12V5A', nombre: 'Fuente 12V 5A', categoria: 'fuentes', marca: 'Genérico', stock_actual: 10, stock_minimo: 5, costo: 18, precio: 25 },
      { codigo_interno: 'PWR-24V', nombre: 'Fuente 24V', categoria: 'fuentes', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 22, precio: 30 },
      { codigo_interno: 'UPS-500', nombre: 'UPS 500VA', categoria: 'fuentes', marca: 'APC', stock_actual: 3, stock_minimo: 2, costo: 65, precio: 85 },
      { codigo_interno: 'UPS-1000', nombre: 'UPS 1000VA', categoria: 'fuentes', marca: 'APC', stock_actual: 2, stock_minimo: 2, costo: 120, precio: 155 },
      { codigo_interno: 'CAB-CAT6-BLU', nombre: 'Cable Cat6 Azul (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 500, stock_minimo: 100, costo: 1, precio: 1.50 },
      { codigo_interno: 'CAB-CAT6-BLK', nombre: 'Cable Cat6 Negro (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 300, stock_minimo: 100, costo: 1, precio: 1.50 },
      { codigo_interno: 'CAB-COAX', nombre: 'Cable Coaxial RG59 (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 200, stock_minimo: 50, costo: 0.80, precio: 1.20 },
      { codigo_interno: 'CAB-POWER', nombre: 'Cable Poder DC (metro)', categoria: 'cables', marca: 'Genérico', stock_actual: 150, stock_minimo: 50, costo: 0.60, precio: 1 },
      { codigo_interno: 'CON-RG59', nombre: 'Conector RG59', categoria: 'conectores', marca: 'Genérico', stock_actual: 100, stock_minimo: 20, costo: 0.30, precio: 0.50 },
      { codigo_interno: 'CON-BNC', nombre: 'Conector BNC', categoria: 'conectores', marca: 'Genérico', stock_actual: 80, stock_minimo: 20, costo: 0.25, precio: 0.45 },
      { codigo_interno: 'CON-RJ45', nombre: 'Conector RJ45', categoria: 'conectores', marca: 'Genérico', stock_actual: 150, stock_minimo: 30, costo: 0.20, precio: 0.40 },
      { codigo_interno: 'CON-DC', nombre: 'Conector DC Macho', categoria: 'conectores', marca: 'Genérico', stock_actual: 60, stock_minimo: 15, costo: 0.35, precio: 0.60 },
      { codigo_interno: 'FUS-12V', nombre: 'Fusible 12V', categoria: 'accesorios', marca: 'Genérico', stock_actual: 50, stock_minimo: 10, costo: 0.15, precio: 0.30 },
      { codigo_interno: 'TOR-12V', nombre: 'Tornillos 12mm', categoria: 'accesorios', marca: 'Genérico', stock_actual: 200, stock_minimo: 50, costo: 0.05, precio: 0.10 },
      { codigo_interno: 'TUB-COR', nombre: 'Tubo Corrugado 3/4"', categoria: 'accesorios', marca: 'Genérico', stock_actual: 30, stock_minimo: 10, costo: 1.50, precio: 2.50 },
      { codigo_interno: 'CAJ-EXTER', nombre: 'Caja Exterior CCTV', categoria: 'accesorios', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 12, precio: 18 },
      { codigo_interno: 'CAJ-INTER', nombre: 'Caja Interior', categoria: 'accesorios', marca: 'Genérico', stock_actual: 15, stock_minimo: 5, costo: 8, precio: 12 },
      { codigo_interno: 'SOP-PARED', nombre: 'Soporte de Pared', categoria: 'accesorios', marca: 'Genérico', stock_actual: 20, stock_minimo: 5, costo: 10, precio: 15 },
      { codigo_interno: 'SOP-TECHO', nombre: 'Soporte de Techo', categoria: 'accesorios', marca: 'Genérico', stock_actual: 12, stock_minimo: 3, costo: 12, precio: 18 },
      { codigo_interno: 'MOUSE-PS2', nombre: 'Mouse USB', categoria: 'accesorios', marca: 'Genérico', stock_actual: 10, stock_minimo: 3, costo: 5, precio: 8 },
      { codigo_interno: 'TECLADO-USB', nombre: 'Teclado USB', categoria: 'accesorios', marca: 'Genérico', stock_actual: 8, stock_minimo: 3, costo: 8, precio: 12 },
      { codigo_interno: 'CABLE-HDMI', nombre: 'Cable HDMI 1.5m', categoria: 'accesorios', marca: 'Genérico', stock_actual: 15, stock_minimo: 5, costo: 6, precio: 10 },
      { codigo_interno: 'USB-WIFI', nombre: 'Adaptador WiFi USB', categoria: 'accesorios', marca: 'TP-Link', stock_actual: 5, stock_minimo: 2, costo: 15, precio: 22 },
      { codigo_interno: 'SWITCH-4P', nombre: 'Switch 4 Puertos', categoria: 'red', marca: 'TP-Link', stock_actual: 8, stock_minimo: 3, costo: 18, precio: 25 },
      { codigo_interno: 'SWITCH-8P', nombre: 'Switch 8 Puertos', categoria: 'red', marca: 'TP-Link', stock_actual: 5, stock_minimo: 2, costo: 28, precio: 38 }
    ];
    
    const insertRepuesto = db.prepare(`
      INSERT INTO repuestos (codigo_interno, nombre, categoria, marca, stock_actual, stock_minimo, costo_unitario, precio_venta, estado)
      VALUES (@codigo_interno, @nombre, @categoria, @marca, @stock_actual, @stock_minimo, @costo, @precio, 'activo')
    `);
    
    repuestos.forEach(r => insertRepuesto.run(r));
    
    // Crear servicios de ejemplo
    const hoy = new Date();
    const servicios = [
      {
        tipo_servicio: 'instalacion',
        fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 8, 0).toISOString(),
        estado: 'programado',
        id_cliente: 1,
        prioridad: 'alta',
        sistema_instalado: 'CCTV 4 cámaras',
        cantidad_camaras: 4
      },
      {
        tipo_servicio: 'mantenimiento',
        fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 30).toISOString(),
        estado: 'programado',
        id_cliente: 3,
        prioridad: 'media',
        sistema_instalado: 'Sistema CCTV',
        cantidad_camaras: 8
      },
      {
        tipo_servicio: 'revision',
        fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0).toISOString(),
        estado: 'programado',
        id_cliente: 2,
        prioridad: 'baja',
        sistema_instalado: 'CCTV Domo',
        cantidad_camaras: 2
      },
      {
        tipo_servicio: 'mantenimiento',
        fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 9, 0).toISOString(),
        estado: 'programado',
        id_cliente: 5,
        prioridad: 'media',
        sistema_instalado: 'Sistema IP',
        cantidad_camaras: 6
      },
      {
        tipo_servicio: 'reparacion',
        fecha_programada: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 11, 0).toISOString(),
        estado: 'programado',
        id_cliente: 7,
        prioridad: 'urgente',
        sistema_instalado: 'CCTV 16 cámaras',
        cantidad_camaras: 16
      }
    ];
    
    const insertServicio = db.prepare(`
      INSERT INTO servicios (codigo_servicio, id_cliente, id_tecnico, tipo_servicio, fecha_programada, estado, prioridad, sistema_instalado, cantidad_camaras)
      VALUES (@codigo, @id_cliente, 1, @tipo_servicio, @fecha_programada, @estado, @prioridad, @sistema_instalado, @cantidad_camaras)
    `);
    
    const year = new Date().getFullYear();
    servicios.forEach((s, i) => {
      insertServicio.run({
        codigo: `SER-${year}-${(i + 1).toString().padStart(4, '0')}`,
        ...s
      });
    });
    
    // Crear cotizaciones
    const cotizaciones = [
      {
        id_cliente: 1,
        estado: 'borrador',
        subtotal: 450,
        iva: 54,
        total: 504,
        forma_pago: '50% anticipo, 50% entrega',
        tiempo_entrega: '5 días hábiles'
      },
      {
        id_cliente: 3,
        estado: 'enviada',
        subtotal: 1200,
        iva: 144,
        total: 1344,
        forma_pago: '100% anticipo',
        tiempo_entrega: '7 días hábiles'
      },
      {
        id_cliente: 5,
        estado: 'aprobada',
        subtotal: 890,
        iva: 106.80,
        total: 996.80,
        forma_pago: '50% anticipo, 50% entrega',
        tiempo_entrega: '10 días hábiles'
      }
    ];
    
    const insertCotizacion = db.prepare(`
      INSERT INTO cotizaciones (codigo_cotizacion, id_cliente, id_tecnico, estado, subtotal, iva, total, forma_pago, tiempo_entrega)
      VALUES (@codigo, @id_cliente, 1, @estado, @subtotal, @iva, @total, @forma_pago, @tiempo_entrega)
    `);
    
    cotizaciones.forEach((c, i) => {
      insertCotizacion.run({
        codigo: `COT-${year}-${(i + 1).toString().padStart(4, '0')}`,
        ...c
      });
    });
    
    console.log('✅ Datos de prueba insertados correctamente');
  } catch (error) {
    console.error('❌ Error insertando datos de prueba:', error);
    throw error;
  }
};

// ========================================
// INICIALIZAR BASE DE DATOS
// ========================================

// ========================================
// INICIALIZAR BASE DE DATOS
// ========================================

const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');

    // Inicializar sql.js
    SQL = await initSqlJs();

    // Intentar cargar la base de datos existente
    let data;
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath);
    }

    // Crear o cargar la base de datos
    const sqlDb = new SQL.Database(data);
    
    // Asignar sqlDb al proxy
    dbProxy.sqlDb = sqlDb;
    db = sqlDb;

    // Crear tablas
    createTables();

    // Insertar datos de prueba
    seedDatabase();

    // Guardar la base de datos
    dbProxy.saveDatabase();

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
};

// ========================================
// EXPORTAR
// ========================================

// Crear un objeto proxy que se inicializa después
const dbProxy = {
  sqlDb: null,
  
  pragma(statement) {
    if (!this.sqlDb) return true;
    return true;
  },

  exec(sql) {
    if (!this.sqlDb) throw new Error('Database no inicializada');
    try {
      this.sqlDb.exec(sql);
      return this;
    } catch (error) {
      console.error('Error ejecutando SQL:', error);
      throw error;
    }
  },

  prepare(sql) {
    if (!this.sqlDb) throw new Error('Database no inicializada');
    return createPreparedStatement(this.sqlDb, sql);
  },

  saveDatabase() {
    if (this.sqlDb) {
      const data = this.sqlDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  },

  initDatabase
};

// Función para crear prepared statements
function createPreparedStatement(sqlDb, sql) {
  return {
    run(...params) {
      try {
        let binds = [];
        let sqlWithPositional = sql;
        
        if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          const bindMap = params[0];
          const namedParamRegex = /@(\w+)/g;
          let match;
          const paramNames = [];
          
          while ((match = namedParamRegex.exec(sql)) !== null) {
            paramNames.push(match[1]);
          }
          
          sqlWithPositional = sql.replace(/@\w+/g, '?');
          binds = paramNames.map(name => bindMap[name]);
        } else {
          binds = params;
        }
        
        const stmt = sqlDb.prepare(sqlWithPositional);
        stmt.bind(binds);
        stmt.step();
        stmt.free();
        
        return { changes: sqlDb.getRowsModified() };
      } catch (error) {
        console.error('Error en run:', error, 'SQL:', sql);
        throw error;
      }
    },
    get(...params) {
      try {
        let binds = [];
        let sqlWithPositional = sql;
        
        if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          const bindMap = params[0];
          const namedParamRegex = /@(\w+)/g;
          let match;
          const paramNames = [];
          
          while ((match = namedParamRegex.exec(sql)) !== null) {
            paramNames.push(match[1]);
          }
          
          sqlWithPositional = sql.replace(/@\w+/g, '?');
          binds = paramNames.map(name => bindMap[name]);
        } else {
          binds = params;
        }
        
        const stmt = sqlDb.prepare(sqlWithPositional);
        stmt.bind(binds);
        
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      } catch (error) {
        console.error('Error en get:', error);
        throw error;
      }
    },
    all(...params) {
      try {
        let binds = [];
        let sqlWithPositional = sql;
        
        if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          const bindMap = params[0];
          const namedParamRegex = /@(\w+)/g;
          let match;
          const paramNames = [];
          
          while ((match = namedParamRegex.exec(sql)) !== null) {
            paramNames.push(match[1]);
          }
          
          sqlWithPositional = sql.replace(/@\w+/g, '?');
          binds = paramNames.map(name => bindMap[name]);
        } else {
          binds = params;
        }
        
        const stmt = sqlDb.prepare(sqlWithPositional);
        stmt.bind(binds);
        
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        
        return rows;
      } catch (error) {
        console.error('Error en all:', error);
        throw error;
      }
    }
  };
}

module.exports = dbProxy;