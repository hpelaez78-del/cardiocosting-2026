const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_cardiocosting';

const login = async (req, res) => {
  const identifier = req.body.email || req.body.usuario || req.body.username;
  const password = req.body.password || req.body.contrasena;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Debe proporcionar usuario y contraseña' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, nombre, email, password_hash, role_id, activo, sede_id 
       FROM usuarios 
       WHERE LOWER(email) = LOWER($1);`,
      [String(identifier).trim()]
    );

    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const roleRes = await pool.query('SELECT nombre, permisos FROM roles WHERE id = $1;', [user.role_id]);
    const roleName = roleRes.rows[0]?.nombre || 'USUARIO';

    const userData = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role_id: user.role_id,
      role: roleName,
      permisos: roleRes.rows[0]?.permisos || {},
      sede_id: user.sede_id
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: userData,
      // Compatibilidad con lecturas de frontend que buscan data.session
      session: {
        access_token: token,
        token_type: 'bearer',
        user: userData
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor durante la autenticación: ' + error.message });
  }
};

module.exports = {
  login
};