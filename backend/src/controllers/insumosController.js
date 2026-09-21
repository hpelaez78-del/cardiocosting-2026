const db = require('../config/db');

const getExamenes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, codigo_cups, nombre
      FROM examenes
      ORDER BY nombre ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar exámenes: ' + error.message });
  }
};

const getInsumos = async (req, res) => {
  try {
    const { examenId } = req.params || {};
    const conditions = examenId ? 'WHERE examen_id = $1' : '';
    const params = examenId ? [examenId] : [];

    const result = await db.query(`
      SELECT
        id,
        examen_id,
        nombre_insumo,
        cantidad,
        valor_unitario,
        (cantidad * valor_unitario) AS subtotal
      FROM insumos_detalle
      ${conditions}
      ORDER BY examen_id, nombre_insumo ASC;
    `, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar insumos: ' + error.message });
  }
};

const createInsumo = async (req, res) => {
  const { examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};

  if (!examen_id || !nombre_insumo) {
    return res.status(400).json({ error: 'Faltan examen_id o nombre_insumo' });
  }

  try {
    const result = await db.query(`
      INSERT INTO insumos_detalle (examen_id, nombre_insumo, cantidad, valor_unitario)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [
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
  const { examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};

  try {
    const result = await db.query(`
      UPDATE insumos_detalle
      SET examen_id = $1,
          nombre_insumo = $2,
          cantidad = $3,
          valor_unitario = $4
      WHERE id = $5
      RETURNING *;
    `, [
      String(examen_id).trim(),
      String(nombre_insumo).trim(),
      Number(cantidad) || 1,
      Number(valor_unitario) || 0,
      id
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

  try {
    const result = await db.query(`
      DELETE FROM insumos_detalle
      WHERE id = $1
      RETURNING *;
    `, [id]);

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
  updateInsumo,
  deleteInsumo
};
