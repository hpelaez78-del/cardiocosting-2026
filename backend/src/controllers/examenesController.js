const db = require('../config/db');

const getExamenes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM examenes ORDER BY id ASC');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR EXAMENES DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar exámenes: ' + error.message });
  }
};

module.exports = {
  getExamenes,
  obtenerExamenes: getExamenes
};