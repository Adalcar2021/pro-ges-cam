/**
 * Base de Datos - CAMSEG
 * Sistema de Gestión de Seguridad Electrónica
 * Usando SQLite3 nativo
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Ruta de la base de datos
const dbPath = path.join(__dirname, 'camseg.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
    initDatabase();
  }
});

// ========================================
// CREACIÓN DE TABLAS
// ========================================

const createTables = () => {
  return new Promise((resolve, reject) => {
    let tablesCreated = 0;
    const totalTables = 9; // Actualizado a 9 tablas
    
    const checkAllTablesCreated = () => {
      tablesCreated++;
      if (tablesCreated === totalTables) {
        console.log('📋 Tablas creadas correctamente');
        resolve();
      }
    };

    db.serialize(() => {
      // Tabla de usuarios
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
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
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla usuarios:', err);
          return reject(err);
        }
        console.log('📋 Tabla usuarios creada');
        checkAllTablesCreated();
      });

      // Tabla de clientes
      db.run(`CREATE TABLE IF NOT EXISTS clientes (
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
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla clientes:', err);
        } else {
          console.log('📋 Tabla clientes creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de servicios
      db.run(`CREATE TABLE IF NOT EXISTS servicios (
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
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla servicios:', err);
        } else {
          console.log('📋 Tabla servicios creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de repuestos/inventario
      db.run(`CREATE TABLE IF NOT EXISTS repuestos (
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
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla repuestos:', err);
        } else {
          console.log('📋 Tabla repuestos creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de cotizaciones
      db.run(`CREATE TABLE IF NOT EXISTS cotizaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_cotizacion TEXT UNIQUE NOT NULL,
        id_cliente INTEGER NOT NULL,
        id_usuario_vendedor INTEGER NOT NULL,
        fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_validez DATETIME,
        estado TEXT DEFAULT 'pendiente',
        subtotal REAL DEFAULT 0,
        descuento_porcentaje REAL DEFAULT 0,
        descuento_valor REAL DEFAULT 0,
        impuesto_porcentaje REAL DEFAULT 0,
        impuesto_valor REAL DEFAULT 0,
        total REAL DEFAULT 0,
        observaciones TEXT,
        terminos_condiciones TEXT,
        forma_pago TEXT,
        plazo_entrega TEXT,
        garantia TEXT,
        cliente_aprobado INTEGER DEFAULT 0,
        fecha_aprobacion DATETIME,
        convertida_a_servicio INTEGER DEFAULT 0,
        id_servicio_convertido INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes(id),
        FOREIGN KEY (id_usuario_vendedor) REFERENCES usuarios(id),
        FOREIGN KEY (id_servicio_convertido) REFERENCES servicios(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla cotizaciones:', err);
        } else {
          console.log('📋 Tabla cotizaciones creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de detalles de cotización
      db.run(`CREATE TABLE IF NOT EXISTS cotizacion_detalles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cotizacion INTEGER NOT NULL,
        id_repuesto INTEGER,
        concepto TEXT NOT NULL,
        descripcion TEXT,
        cantidad INTEGER DEFAULT 1,
        precio_unitario REAL DEFAULT 0,
        descuento_porcentaje REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        tipo_item TEXT DEFAULT 'producto',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id),
        FOREIGN KEY (id_repuesto) REFERENCES repuestos(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla cotizacion_detalles:', err);
        } else {
          console.log('📋 Tabla cotizacion_detalles creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de materiales usados en servicios
      db.run(`CREATE TABLE IF NOT EXISTS servicio_materiales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_servicio INTEGER NOT NULL,
        id_repuesto INTEGER NOT NULL,
        cantidad_usada INTEGER DEFAULT 1,
        costo_unitario REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_servicio) REFERENCES servicios(id),
        FOREIGN KEY (id_repuesto) REFERENCES repuestos(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla servicio_materiales:', err);
        } else {
          console.log('📋 Tabla servicio_materiales creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de ventas
      db.run(`CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_factura TEXT UNIQUE NOT NULL,
        id_cliente INTEGER NOT NULL,
        id_vendedor INTEGER NOT NULL,
        fecha_venta DATETIME NOT NULL,
        metodo_pago TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        descuento_general REAL DEFAULT 0,
        impuesto_porcentaje REAL DEFAULT 12,
        impuesto_valor REAL DEFAULT 0,
        total REAL DEFAULT 0,
        estado TEXT DEFAULT 'pendiente',
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes(id),
        FOREIGN KEY (id_vendedor) REFERENCES usuarios(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla ventas:', err);
        } else {
          console.log('📋 Tabla ventas creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de detalles de venta
      db.run(`CREATE TABLE IF NOT EXISTS venta_detalles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_venta INTEGER NOT NULL,
        id_repuesto INTEGER,
        nombre_producto TEXT NOT NULL,
        descripcion TEXT,
        cantidad INTEGER DEFAULT 1,
        precio_unitario REAL DEFAULT 0,
        descuento REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_venta) REFERENCES ventas(id),
        FOREIGN KEY (id_repuesto) REFERENCES repuestos(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla venta_detalles:', err);
        } else {
          console.log('📋 Tabla venta_detalles creada');
        }
        checkAllTablesCreated();
      });

      // Tabla de pagos de ventas
      db.run(`CREATE TABLE IF NOT EXISTS venta_pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_venta INTEGER NOT NULL,
        metodo_pago TEXT NOT NULL,
        monto REAL DEFAULT 0,
        referencia TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_venta) REFERENCES ventas(id)
      )`, (err) => {
        if (err) {
          console.error('Error creando tabla venta_pagos:', err);
        } else {
          console.log('📋 Tabla venta_pagos creada');
        }
        checkAllTablesCreated();
      });
    });
  });
};

// ========================================
// SEED DATA - DATOS DE PRUEBA
// ========================================

const seedDatabase = () => {
  return new Promise((resolve, reject) => {
    // Verificar si ya hay usuarios
    db.get('SELECT COUNT(*) as count FROM usuarios', (err, row) => {
      if (err) {
        console.error('Error verificando usuarios:', err);
        return reject(err);
      }

      console.log('🔍 Usuarios existentes:', row.count);

      if (row.count === 0) {
        console.log('📦 Insertando datos de prueba...');
        
        // Crear usuarios
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        console.log('🔐 Contraseña hasheada:', hashedPassword.substring(0, 20) + '...');
        
        const usuarios = [
          ['Adalberto Cárdenas', 'adalberto', hashedPassword, 'adalberto@camseg.com', '555-1234', 'admin'],
          ['Juan Pérez', 'juanp', hashedPassword, 'juan@camseg.com', '555-5678', 'tecnico'],
          ['María García', 'mariag', hashedPassword, 'maria@camseg.com', '555-9012', 'tecnico']
        ];

        const insertUsuario = db.prepare(`
          INSERT INTO usuarios (nombre_completo, usuario, password, email, telefono, rol)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        usuarios.forEach(usuario => {
          insertUsuario.run(usuario, (err) => {
            if (err) {
              console.error('Error insertando usuario:', err);
            } else {
              console.log(`👥 Usuario creado: ${usuario[1]}`);
            }
          });
        });

        insertUsuario.finalize(() => {
          // Insertar clientes de prueba
          const clientes = [
            ['Juan Rodríguez', 'residencial', '12345678', null, 'Juan Rodríguez', '555-1001', '555-1002', 'juan@email.com', 'Calle Principal 123', 'Bogotá', 'Cundinamarca', null, null, 'Frente al parque', 'Cliente regular', 'activo'],
            ['Tech Solutions SAS', 'empresarial', '860123456', 'Tech Solutions SAS', 'Carlos Mendoza', '555-2001', '555-2002', 'contacto@techsolutions.com', 'Av. Industrial 456', 'Medellín', 'Antioquia', null, null, 'Edificio Corporativo', 'Sistema completo', 'activo'],
            ['María López', 'residencial', '98765432', null, 'María López', '555-3001', null, 'maria@email.com', 'Carrera 7 #89-45', 'Cali', 'Valle', null, null, 'Apartamento 502', 'Mantenimiento mensual', 'activo']
          ];

          const insertCliente = db.prepare(`
            INSERT INTO clientes (nombre, tipo_cliente, documento, razon_social, contacto_principal, telefono, telefono_alternativo, email, direccion, ciudad, departamento, latitud, longitud, referencia_direccion, observaciones, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          clientes.forEach(cliente => {
            insertCliente.run(cliente, (err) => {
              if (err) {
                console.error('Error insertando cliente:', err);
              } else {
                console.log(`👥 Cliente creado: ${cliente[0]}`);
              }
            });
          });

          insertCliente.finalize(() => {
            // Insertar repuestos de prueba
            const repuestos = [
              ['CAM001', null, 'Cámara HD 1080p', 'Cámara de seguridad interior', 'Cámaras', 'Hikvision', 'DS-2CD2032-I', 15, 5, 50, 'Almacén A', 120000, 180000, 'activo'],
              ['DVR001', null, 'DVR 8 Canales', 'Grabador digital', 'DVR', 'Hikvision', 'DS-7208HUHI-K2', 8, 2, 20, 'Almacén B', 450000, 650000, 'activo'],
              ['CAB001', null, 'Cable Coaxial', 'Cable para cámaras', 'Cables', 'Generic', 'RG59', 100, 20, 200, 'Almacén C', 2500, 4500, 'activo']
            ];

            const insertRepuesto = db.prepare(`
              INSERT INTO repuestos (codigo_interno, codigo_proveedor, nombre, descripcion, categoria, marca, modelo, stock_actual, stock_minimo, stock_maximo, ubicacion_almacen, costo_unitario, precio_venta, estado)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            repuestos.forEach(repuesto => {
              insertRepuesto.run(repuesto, (err) => {
                if (err) {
                  console.error('Error insertando repuesto:', err);
                } else {
                  console.log(`📦 Repuesto creado: ${repuesto[2]}`);
                }
              });
            });

            insertRepuesto.finalize(() => {
              // Insertar servicios de prueba
              const servicios = [
                ['SERV001', 1, 1, 'instalacion', null, new Date().toISOString(), new Date().toISOString(), 240, 180, 'completado', 'media', 'Calle Principal 123', 'Sistema 4 cámaras', 4, 'Instalación completa', 'Todo funcionando', 'Instaladas 4 cámaras HD', 1, 1, null],
                ['SERV002', 2, 1, 'mantenimiento', 'preventivo', new Date().toISOString(), null, 120, null, 'programado', 'alta', 'Av. Industrial 456', 'Sistema 8 cámaras', 8, 'Revisión general', null, null, 0, 0, null],
                ['SERV003', 3, 2, 'reparacion', null, new Date(Date.now() + 86400000).toISOString(), null, 60, null, 'programado', 'media', 'Carrera 7 #89-45', '1 cámara', 1, 'Cámara no enciende', null, null, 0, 0, null]
              ];

              const insertServicio = db.prepare(`
                INSERT INTO servicios (codigo_servicio, id_cliente, id_tecnico, tipo_servicio, subtipo_mantenimiento, fecha_programada, fecha_realizacion, duracion_estimada, duracion_real, estado, prioridad, direccion_servicio, sistema_instalado, cantidad_camaras, descripcion_trabajo, diagnostico, trabajo_realizado, checklist_completo, cliente_instruido, firma_cliente)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              servicios.forEach(servicio => {
                insertServicio.run(servicio, (err) => {
                  if (err) {
                    console.error('Error insertando servicio:', err);
                  } else {
                    console.log(`🔧 Servicio creado: ${servicio[0]}`);
                  }
                });
              });

              insertServicio.finalize(() => {
                // Insertar cotizaciones de prueba
                const cotizaciones = [
                  ['COT001', 2, 1, new Date().toISOString(), new Date(Date.now() + 7*86400000).toISOString(), 'pendiente', 1200000, 10, 120000, 19, 205200, 1285200, 'Sistema completo para oficina', 'Condiciones estándar', '50% anticipo', '3 días', '1 año', 0, null, 0, null],
                  ['COT002', 3, 1, new Date().toISOString(), new Date(Date.now() + 5*86400000).toISOString(), 'aprobada', 650000, 5, 32500, 19, 117350, 734850, 'Reparación cámara', 'Garantía 3 meses', 'Pago contra entrega', '1 día', '3 meses', 1, new Date().toISOString(), 0, null]
                ];

                const insertCotizacion = db.prepare(`
                  INSERT INTO cotizaciones (codigo_cotizacion, id_cliente, id_usuario_vendedor, fecha_emision, fecha_validez, estado, subtotal, descuento_porcentaje, descuento_valor, impuesto_porcentaje, impuesto_valor, total, observaciones, terminos_condiciones, forma_pago, plazo_entrega, garantia, cliente_aprobado, fecha_aprobacion, convertida_a_servicio, id_servicio_convertido)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                cotizaciones.forEach(cotizacion => {
                  insertCotizacion.run(cotizacion, (err) => {
                    if (err) {
                      console.error('Error insertando cotización:', err);
                    } else {
                      console.log(`📄 Cotización creada: ${cotizacion[0]}`);
                    }
                  });
                });

                insertCotizacion.finalize(() => {
                  // Verificar datos creados
                  db.all('SELECT COUNT(*) as usuarios FROM usuarios', (err, rows) => {
                    if (!err) console.log(`📋 Total usuarios: ${rows[0].usuarios}`);
                  });
                  db.all('SELECT COUNT(*) as clientes FROM clientes', (err, rows) => {
                    if (!err) console.log(`📋 Total clientes: ${rows[0].clientes}`);
                  });
                  db.all('SELECT COUNT(*) as servicios FROM servicios', (err, rows) => {
                    if (!err) console.log(`📋 Total servicios: ${rows[0].servicios}`);
                  });
                  db.all('SELECT COUNT(*) as cotizaciones FROM cotizaciones', (err, rows) => {
                    if (!err) console.log(`📋 Total cotizaciones: ${rows[0].cotizaciones}`);
                  });
                  
                  // Insertar datos de prueba para ventas
                  console.log('📦 Insertando datos de prueba para ventas...');
                  
                  // Ventas de prueba
                  const ventas = [
                    {
                      numero_factura: 'FAC2025-0001',
                      id_cliente: 1,
                      id_vendedor: 1,
                      fecha_venta: new Date().toISOString(),
                      metodo_pago: 'efectivo',
                      subtotal: 1200.00,
                      descuento_general: 50.00,
                      impuesto_valor: 138.00,
                      total: 1288.00,
                      estado: 'pagada',
                      notas: 'Venta de equipo completo de cámaras'
                    },
                    {
                      numero_factura: 'FAC2025-0002',
                      id_cliente: 2,
                      id_vendedor: 1,
                      fecha_venta: new Date(Date.now() - 86400000).toISOString(), // Ayer
                      metodo_pago: 'tarjeta',
                      subtotal: 850.00,
                      descuento_general: 0,
                      impuesto_valor: 102.00,
                      total: 952.00,
                      estado: 'pagada',
                      notas: 'Mantenimiento preventivo'
                    },
                    {
                      numero_factura: 'FAC2025-0003',
                      id_cliente: 3,
                      id_vendedor: 1,
                      fecha_venta: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
                      metodo_pago: 'transferencia',
                      subtotal: 450.00,
                      descuento_general: 25.00,
                      impuesto_valor: 51.00,
                      total: 476.00,
                      estado: 'pendiente',
                      notas: 'Venta pendiente de confirmación'
                    }
                  ];
                  
                  const insertVenta = db.prepare(`
                    INSERT INTO ventas (
                      numero_factura, id_cliente, id_vendedor, fecha_venta, metodo_pago,
                      subtotal, descuento_general, impuesto_valor, total, estado, notas
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `);
                  
                  ventas.forEach(venta => {
                    insertVenta.run(venta, (err) => {
                      if (!err) {
                        console.log(`💰 Venta creada: ${venta.numero_factura}`);
                      }
                    });
                  });
                  
                  console.log('✅ Datos de prueba de ventas insertados correctamente');
                  console.log('📋 Total ventas: 3');
                  
                  console.log('✅ Datos de prueba insertados correctamente');
                  resolve();
                });
              });
            });
          });
        });
      } else {
        resolve();
      }
    });
  });
};

// ========================================
// INICIALIZAR BASE DE DATOS
// ========================================

const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    await createTables();
    await seedDatabase();
    
    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  }
};

// ========================================
// EXPORTAR
// ========================================

module.exports = db;
