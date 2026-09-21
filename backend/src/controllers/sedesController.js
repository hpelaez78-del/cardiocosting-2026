const pool = require('../config/db');

const createSede = async (req, res) => {
  const { id, nombre, arriendo, servicios, admin, mtto, volumen } = req.body;

  if (!id || !nombre) {
    return res.status(400).json({ error: 'Falta el id o nombre de la sede' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO sedes (id, nombre, arriendo_mensual, servicios_publicos, nomina_admin, mantenimiento_otros, volumen_mensual_esperado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         nombre,
         arriendo_mensual AS arriendo,
         servicios_publicos AS servicios,
         nomina_admin AS admin,
         mantenimiento_otros AS mtto,
         volumen_mensual_esperado AS volumen;`,
      [
        String(id).trim(),
        String(nombre).trim(),
        Number(arriendo) || 0,
        Number(servicios) || 0,
        Number(admin) || 0,
        Number(mtto) || 0,
        Number(volumen) || 1,
      ]
    );

    res.status(201).json({ message: 'Sede creada correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la sede: ' + error.message });
  }
};

const getSedes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        arriendo_mensual AS arriendo,
        servicios_publicos AS servicios,
        nomina_admin AS admin,
        mantenimiento_otros AS mtto,
        volumen_mensual_esperado AS volumen
      FROM sedes
      ORDER BY id ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar sedes: ' + error.message });
  }
};

const updateSede = async (req, res) => {
  const { id } = req.params;
  const { arriendo, servicios, admin, mtto, volumen } = req.body;

  try {
    const result = await pool.query(
      `UPDATE sedes
       SET arriendo_mensual = $1,
           servicios_publicos = $2,
           nomina_admin = $3,
           mantenimiento_otros = $4,
           volumen_mensual_esperado = $5
       WHERE id = $6
       RETURNING
         id,
         nombre,
         arriendo_mensual AS arriendo,
         servicios_publicos AS servicios,
         nomina_admin AS admin,
         mantenimiento_otros AS mtto,
         volumen_mensual_esperado AS volumen;`,
      [
        Number(arriendo) || 0,
        Number(servicios) || 0,
        Number(admin) || 0,
        Number(mtto) || 0,
        Number(volumen) || 1,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    res.json({ message: 'Sede actualizada exitosamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar sede: ' + error.message });
  }
};

module.exports = {
  createSede,
  getSedes,
  updateSede
};