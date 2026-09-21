const pool = require('../config/db');

const createPersonal = async (req, res) => {
  const { id, cargo, sueldo_base, prov_pct, horas_mes } = req.body;

  if (!id || !cargo) {
    return res.status(400).json({ error: 'Falta el id o nombre del rol' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO personal_cargos (id, cargo, sueldo_base, porcentaje_provisiones, horas_mes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         cargo AS nombre,
         cargo,
         sueldo_base,
         porcentaje_provisiones AS prov_pct,
         horas_mes;`,
      [
        String(id).trim(),
        String(cargo).trim(),
        Number(sueldo_base) || 0,
        Number(prov_pct) || 0,
        Number(horas_mes) || 1,
      ]
    );

    res.status(201).json({ message: 'Rol creado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el rol: ' + error.message });
  }
};

const getPersonal = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        cargo AS nombre,
        cargo,
        sueldo_base,
        porcentaje_provisiones AS prov_pct,
        horas_mes
      FROM personal_cargos
      ORDER BY id ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar personal: ' + error.message });
  }
};

const updatePersonal = async (req, res) => {
  const { id } = req.params;
  const { sueldo_base, prov_pct, horas_mes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE personal_cargos
       SET sueldo_base = $1,
           porcentaje_provisiones = $2,
           horas_mes = $3
       WHERE id = $4
       RETURNING
         id,
         cargo AS nombre,
         cargo,
         sueldo_base,
         porcentaje_provisiones AS prov_pct,
         horas_mes;`,
      [
        Number(sueldo_base) || 0,
        Number(prov_pct) || 0,
        Number(horas_mes) || 1,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json({ message: 'Rol actualizado exitosamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el rol: ' + error.message });
  }
};

module.exports = {
  createPersonal,
  getPersonal,
  updatePersonal
};