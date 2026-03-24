const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

// Rutas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const serviciosRoutes = require('./routes/servicios');
const inventarioRoutes = require('./routes/inventario');
const cotizacionesRoutes = require('./routes/cotizaciones');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================

// CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// ========================================
// RUTAS API
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ========================================
// RUTAS FRONTEND
// ========================================

// Página principal - Redireccionar a login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Cualquier otra ruta - Servir el archivo correspondiente
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, '../frontend', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
  });
});

// ========================================
// MANEJO DE ERRORES
// ========================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

const startServer = async () => {
  try {
    // Iniciar servidor (la base de datos se inicializa automáticamente al requerirla)
    app.listen(PORT, () => {
      console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🛡️  CAMSEG - Servidor iniciado                ║
  ║                                                   ║
  ║   URL: http://localhost:${PORT}                    ║
  ║                                                   ║
  ║   Credenciales de acceso:                          ║
  ║   Usuario: adalberto                              ║
  ║   Contraseña: admin123                            ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;