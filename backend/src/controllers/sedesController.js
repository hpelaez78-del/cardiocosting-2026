const db = require('../config/db');

const resolverSedeId = async (idOrSlug) => {
  if (!idOrSlug) return null;
  const result = await db.query(
    `SELECT id FROM sedes
     WHERE id::text = $1 OR LOWER(nombre) = LOWER($1)
     LIMIT 1;`,
    [String(idOrSlug).trim()]
  );
  return result.rows[0]?.id || null;
};

const getSedes = async (req, res, next) => {
  try {
    const query = 'SELECT * FROM sedes ORDER BY id ASC';
    const result = await db.query(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error('[ERROR GET SEDES]', error.message);
    next(error);
  }
};

const updateSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = await resolverSedeId(id);
    const { arriendo, servicios, mtto, volumen } = req.body;

    if (!numericId) return res.status(404).json({ error: 'Sede no encontrada' });

    const query = `
      UPDATE sedes 
      SET arriendo_mensual = $1,
          servicios_publicos = $2,
          mantenimiento_otros = $3,
          volumen_mensual_esperado = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      RETURNING *
    `;
    const result = await db.query(query, [
      Number(arriendo) || 0,
      Number(servicios) || 0,
      Number(mtto) || 0,
      Number(volumen) || 0,
      numericId
    ]);
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR UPDATE SEDE]', error.message);
    next(error);
  }
};

const getAreasSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sedeId = await resolverSedeId(id);
    if (!sedeId) return res.status(404).json({ error: 'Sede no encontrada' });

    const result = await db.query(
      'SELECT * FROM sede_areas WHERE sede_id = $1 ORDER BY id ASC',
      [sedeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR AREAS SEDE]', error.message);
    next(error);
  }
};

const saveAreasSede = async (req, res, next) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { areas } = req.body;
    const sedeId = await resolverSedeId(id);
    if (!sedeId) return res.status(404).json({ error: 'Sede no encontrada' });
    if (!Array.isArray(areas)) return res.status(400).json({ error: 'El campo areas debe ser una lista' });

    await client.query('BEGIN');
    await client.query('DELETE FROM sede_areas WHERE sede_id = $1', [sedeId]);
    for (const area of areas) {
      await client.query(
        `INSERT INTO sede_areas (sede_id, nombre, m2, es_directo, costo_asignado_directo)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sedeId,
          String(area.nombre || '').trim(),
          Number(area.m2) || 0,
          Boolean(area.esDirecto ?? area.es_directo),
          Number(area.costoAsignadoDirecto ?? area.costo_asignado_directo) || 0
        ]
      );
    }
    await client.query('COMMIT');
    res.json({ mensaje: 'Áreas guardadas correctamente', sedeId, areas });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR GUARDAR AREAS SEDE]', error.message);
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getSedes,
  obtenerSedes: getSedes,
  updateSede,
  actualizarSede: updateSede,
  getAreasSede,
  obtenerAreasSede: getAreasSede,
  saveAreasSede,
  guardarAreasSede: saveAreasSede,
  resolverSedeId
};