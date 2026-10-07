const db = require('../config/db');

const getConvenios = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM convenios ORDER BY id ASC');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR GET CONVENIOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar convenios: ' + error.message });
  }
};

const createConvenio = async (req, res, next) => {
  try {
    const { nombre_eps } = req.body;
    const query = `
      INSERT INTO convenios (nombre_eps, fecha_ultimo_reajuste)
      VALUES ($1, CURRENT_DATE)
      RETURNING *
    `;
    const result = await db.query(query, [String(nombre_eps || '').trim()]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[ERROR CREAR CONVENIO]:', error.message);
    next(error);
  }
};

const getTarifas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
            SELECT tc.id, $1::integer AS convenio_id, e.id AS examen_id,
              COALESCE(tc.tarifa_acordada, 0) AS tarifa_acordada,
              e.nombre AS examen, e.codigo_cups
            FROM examenes e
            LEFT JOIN tarifas_convenios tc
         ON tc.examen_id = e.id AND tc.convenio_id = $1
      ORDER BY e.id ASC;
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR GET TARIFAS DB]:', error.message);
    next(error);
  }
};

const updateTarifas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { examen_id, nueva_tarifa } = req.body;
    if (!examen_id || nueva_tarifa === undefined) {
      return res.status(400).json({ error: 'Debe proporcionar examen_id y nueva_tarifa' });
    }
    const result = await db.query(`
      INSERT INTO tarifas_convenios (convenio_id, examen_id, tarifa_acordada)
      VALUES ($1, $2, $3)
      ON CONFLICT (convenio_id, examen_id)
      DO UPDATE SET tarifa_acordada = EXCLUDED.tarifa_acordada
      RETURNING *;
    `, [id, examen_id, Number(nueva_tarifa)]);
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR ACTUALIZAR TARIFAS]:', error.message);
    next(error);
  }
};

module.exports = {
  getConvenios,
  obtenerConvenios: getConvenios,
  createConvenio,
  crearConvenio: createConvenio,
  getTarifas,
  obtenerTarifas: getTarifas,
  updateTarifas,
  actualizarTarifas: updateTarifas
};