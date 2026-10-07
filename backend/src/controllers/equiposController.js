const db = require('../config/db');

const getEquipos = async (req, res, next) => {
  try {
    let result;
    try {
      result = await db.query('SELECT * FROM equipos ORDER BY id ASC');
    } catch (e1) {
      result = await db.query('SELECT * FROM equipos_biomedicos ORDER BY id ASC');
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR EQUIPOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar equipos: ' + error.message });
  }
};

module.exports = {
  getEquipos,
  obtenerEquipos: getEquipos
};