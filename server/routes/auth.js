const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  try {
    const { usuario, password } = req.body;

    console.log(' Intento de login:', { usuario, password: '***' });

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Agregar logging para depurar
    console.log(' Buscando usuario:', usuario);
    
    db.get('SELECT * FROM usuarios WHERE usuario = ? AND estado = ?', [usuario, 'activo'], (err, user) => {
      if (err) {
        console.error('Error en consulta:', err);
        return res.status(500).json({ error: 'Error al iniciar sesión' });
      }

      console.log(' Usuario encontrado:', user ? { id: user.id, usuario: user.usuario } : null);

      if (!user) {
        // Intentar ver todos los usuarios para depurar
        db.all('SELECT id, usuario, nombre_completo FROM usuarios', [], (err, allUsers) => {
          if (err) {
            console.log(' Error obteniendo todos los usuarios:', err.message);
          } else {
            console.log(' Todos los usuarios en BD:', allUsers);
          }
        });
        
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const validPassword = bcrypt.compareSync(password, user.password);
      console.log(' Contraseña válida:', validPassword);

      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // Actualizar último acceso
      db.run('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?', [new Date().toISOString(), user.id]);

      const token = generateToken(user);

      res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          nombre: user.nombre_completo,
          usuario: user.usuario,
          email: user.email,
          rol: user.rol
        }
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Cerrar sesión (solo cliente, el token se maneja en frontend)
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente' });
});

module.exports = router;