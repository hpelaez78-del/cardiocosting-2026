const db = require('../config/db');

const getRoles = async (req, res, next) => {
  try {
    let result;
    try {
      result = await db.query('SELECT * FROM roles ORDER BY id ASC');
    } catch (e1) {
      result = await db.query('SELECT * FROM personal_cargos ORDER BY id ASC');
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR ROLES DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar roles: ' + error.message });
  }
};

module.exports = {
  getRoles,
  obtenerRoles: getRoles
};