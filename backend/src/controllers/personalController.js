const pool = require('../config/db');

const selectPersonal = `
  SELECT id, sede_id, cargo_key, cargo, grupo_costeo, cantidad,
         sueldo_base, porcentaje_provisiones AS prov_pct, horas_mes,
         ROUND(sueldo_base * (1 + porcentaje_provisiones / 100), 2) AS costo_total_persona
  FROM personal_sede
`;

const getPersonal = async (req, res) => {
  try {
    const { sedeId } = req.query;
    const result = sedeId
      ? await pool.query(`${selectPersonal} WHERE sede_id = $1 ORDER BY id ASC`, [sedeId])
      : await pool.query(`${selectPersonal} ORDER BY sede_id, id ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR PERSONAL DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar personal: ' + error.message });
  }
};

const createPersonal = async (req, res) => {
  const { sede_id, cargo_key, cargo, grupo_costeo, cantidad, sueldo_base, prov_pct, horas_mes } = req.body;
  const validGroups = ['medico', 'asistencial', 'administrativo'];
  if (!sede_id || !cargo_key || !cargo || !validGroups.includes(grupo_costeo)
    || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0
    || !Number.isFinite(Number(sueldo_base)) || Number(sueldo_base) < 0
    || !Number.isFinite(Number(prov_pct)) || Number(prov_pct) < 0
    || !Number.isFinite(Number(horas_mes)) || Number(horas_mes) <= 0) {
    return res.status(400).json({ error: 'Sede, cargo, grupo, cantidad y valores laborales válidos son obligatorios' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO personal_sede
        (sede_id, cargo_key, cargo, grupo_costeo, cantidad, sueldo_base, porcentaje_provisiones, horas_mes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (sede_id, cargo_key) DO UPDATE SET
        cargo = EXCLUDED.cargo,
        grupo_costeo = EXCLUDED.grupo_costeo,
        cantidad = EXCLUDED.cantidad,
        sueldo_base = EXCLUDED.sueldo_base,
        porcentaje_provisiones = EXCLUDED.porcentaje_provisiones,
        horas_mes = EXCLUDED.horas_mes
      RETURNING id, sede_id, cargo_key, cargo, grupo_costeo, cantidad,
                sueldo_base, porcentaje_provisiones AS prov_pct, horas_mes,
                ROUND(sueldo_base * (1 + porcentaje_provisiones / 100), 2) AS costo_total_persona;
    `, [sede_id, cargo_key, cargo.trim(), grupo_costeo, Number(cantidad), Number(sueldo_base), Number(prov_pct), Number(horas_mes)]);
    res.status(201).json({ message: 'Personal de sede guardado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar personal: ' + error.message });
  }
};

const updatePersonal = async (req, res) => {
  const { cantidad, sueldo_base, prov_pct, horas_mes } = req.body;
  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0
    || !Number.isFinite(Number(sueldo_base)) || Number(sueldo_base) < 0
    || !Number.isFinite(Number(prov_pct)) || Number(prov_pct) < 0
    || !Number.isFinite(Number(horas_mes)) || Number(horas_mes) <= 0) {
    return res.status(400).json({ error: 'Cantidad y valores laborales válidos son obligatorios' });
  }

  try {
    const result = await pool.query(`
      UPDATE personal_sede
      SET cantidad = $1,
          sueldo_base = $2,
          porcentaje_provisiones = $3,
          horas_mes = $4
      WHERE id = $5
      RETURNING id, sede_id, cargo_key, cargo, grupo_costeo, cantidad,
                sueldo_base, porcentaje_provisiones AS prov_pct, horas_mes,
                ROUND(sueldo_base * (1 + porcentaje_provisiones / 100), 2) AS costo_total_persona;
    `, [Number(cantidad), Number(sueldo_base), Number(prov_pct), Number(horas_mes), req.params.id]);

    if (!result.rowCount) return res.status(404).json({ error: 'Cargo no encontrado' });
    res.json({ message: 'Costo del cargo actualizado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar personal: ' + error.message });
  }
};

module.exports = { createPersonal, getPersonal, updatePersonal };