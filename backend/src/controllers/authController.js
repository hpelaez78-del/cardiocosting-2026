const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, password } = req.body;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  try {
    console.log('--- INTENTO DE LOGIN ---');
    console.log('Email recibido:', email);

    const result = await pool.query(`
      SELECT u.*, r.nombre AS rol, r.permisos
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1;
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
    }

    const usuario = result.rows[0];

    // Detectar dinámicamente la columna de la contraseña en la BD
    const dbPassword = usuario.password || usuario.contrasena || usuario.clave || usuario.password_hash;

    if (!dbPassword) {
      return res.status(500).json({ error: 'El usuario no tiene una contraseña configurada en la BD' });
    }

    // Comparar hash bcrypt o texto plano
    let passwordValida = false;
    if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$')) {
      passwordValida = await bcrypt.compare(password, dbPassword);
    } else {
      passwordValida = (password === dbPassword);
    }

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
    }

    const permisos = Array.isArray(usuario.permisos)
      ? usuario.permisos
      : (usuario.permisos ? JSON.parse(JSON.stringify(usuario.permisos)) : []);

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        permisos
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        permisos
      }
    });
  } catch (error) {
    console.error('Error en controller de login:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      detail: error.message
    });
  }
};

module.exports = { login };