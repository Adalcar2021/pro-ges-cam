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
  `);
};

// ========================================
// SEED DATA - DATOS DE PRUEBA
// ========================================

const seedDatabase = () => {
  try {
    console.log(' Insertando datos de prueba...');
    
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
        const result = insertUsuario.run(u);
        console.log(`👥 Usuario creado: ${u.nombre_completo}, ID: ${JSON.stringify(result)}`);
      } catch (error) {
        console.error(`🚫 Error creando usuario: ${u.nombre_completo}`, error);
      }
    });
    
    // Verificar usuarios creados
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
      console.log('📋 Total de usuarios:', userCount ? userCount.count : 'ERROR');
    } catch (error) {
      console.log('📋 Error verificando usuarios:', error.message);
    }
    
    console.log('✅ Datos de prueba insertados correctamente');
  } catch (error) {
    console.error('❌ Error insertando datos de prueba:', error);
    throw error;
  }
};

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

    // Crear tablas PRIMERO
    console.log('📋 Creando tablas...');
    createTables();

    // Insertar datos de prueba inmediatamente
    console.log('📦 Insertando datos de prueba...');
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
      console.log('💾 Guardando base de datos...');
      const data = this.sqlDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      console.log('✅ Base de datos guardada en:', dbPath);
    } else {
      console.log('❌ Base de datos no inicializada, no se puede guardar');
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
