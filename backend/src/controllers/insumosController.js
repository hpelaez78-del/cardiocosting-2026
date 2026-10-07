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

const getInsumos = async (req, res) => {
  try {
    const { examenId } = req.params || {};
    const { sedeId } = req.query;
    if (!sedeId) return res.status(400).json({ error: 'Debe especificar la sede para consultar insumos' });
    const conditions = examenId ? 'WHERE sede_id = $1 AND examen_id = $2' : 'WHERE sede_id = $1';
    const params = examenId ? [sedeId, examenId] : [sedeId];

    const result = await db.query(`
      SELECT * FROM insumos_detalle
      ${conditions}
      ORDER BY id ASC;
    `, params);

    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR INSUMOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar insumos: ' + error.message });
  }
};

const createInsumo = async (req, res) => {
  const { sede_id, examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};

  if (!sede_id || !examen_id || !nombre_insumo) {
    return res.status(400).json({ error: 'Faltan sede_id, examen_id o nombre_insumo' });
  }

  try {
    const result = await db.query(`
      INSERT INTO insumos_detalle (sede_id, examen_id, nombre_insumo, cantidad, valor_unitario)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [
      String(sede_id).trim(),
      String(examen_id).trim(),
      String(nombre_insumo).trim(),
      Number(cantidad) || 1,
      Number(valor_unitario) || 0
    ]);

    res.status(201).json({ message: 'Insumo creado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el insumo: ' + error.message });
  }
};

const updateInsumo = async (req, res) => {
  const { id } = req.params;
  const { sede_id, examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};
  if (!sede_id) return res.status(400).json({ error: 'Debe especificar la sede del insumo' });

  try {
    const result = await db.query(`
      UPDATE insumos_detalle
        SET examen_id = $1,
          nombre_insumo = $2,
          cantidad = $3,
          valor_unitario = $4
        WHERE id = $5 AND sede_id = $6
      RETURNING *;
    `, [
      String(examen_id).trim(),
      String(nombre_insumo).trim(),
      Number(cantidad) || 1,
      Number(valor_unitario) || 0,
      id,
      sede_id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ message: 'Insumo actualizado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el insumo: ' + error.message });
  }
};

const deleteInsumo = async (req, res) => {
  const { id } = req.params;
  const { sedeId } = req.query;
  if (!sedeId) return res.status(400).json({ error: 'Debe especificar la sede del insumo' });

  try {
    const result = await db.query(`
      DELETE FROM insumos_detalle
      WHERE id = $1 AND sede_id = $2
      RETURNING *;
    `, [id, sedeId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el insumo: ' + error.message });
  }
};

module.exports = {
  getExamenes,
  getInsumos,
  createInsumo,
  saveInsumos: createInsumo,
  saveInsumo: createInsumo,
  updateInsumo,
  deleteInsumo
};