const pool = require('../config/db');

const getCostosCompat = async (req, res) => {
  try {
    const [sedesRes, rolesRes, examenesRes] = await Promise.all([
      pool.query(`
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
      `),
      pool.query(`
        SELECT
          id,
          cargo AS nombre,
          cargo,
          sueldo_base,
          porcentaje_provisiones AS prov_pct,
          horas_mes
        FROM personal_cargos
        ORDER BY id ASC;
      `),
      pool.query(`
        SELECT
          e.id,
          e.nombre,
          e.minutos_medico AS min_medico,
          e.minutos_asistencial AS min_asis,
          COALESCE(i.costo_insumos_detalle, e.costo_insumos_directos, 0) AS insumos,
          e.costo_depreciacion_equipos AS cips,
          e.tarifa_soat_referencia AS tarifa_convenio,
          e.volumen_mes_proyectado AS vol_mes
        FROM examenes e
        LEFT JOIN (
          SELECT examen_id, SUM(cantidad * valor_unitario) AS costo_insumos_detalle
          FROM insumos_detalle
          GROUP BY examen_id
        ) i ON i.examen_id = e.id
        ORDER BY e.id ASC;
      `)
    ]);

    const convenioId = req.query?.convenioId || req.query?.convenio || null;
    let tarifaMap = {};

    const selectedConvenioId = convenioId
      ? Number(convenioId)
      : await pool.query(`
          SELECT id
          FROM convenios
          WHERE LOWER(TRIM(nombre_eps)) = 'general'
          LIMIT 1;
        `).then((res) => res.rows[0]?.id ?? null);

    if (selectedConvenioId) {
      const tarifasRes = await pool.query(`
        SELECT examen_id, tarifa_acordada
        FROM tarifas_convenios
        WHERE convenio_id = $1;
      `, [selectedConvenioId]);

      tarifaMap = tarifasRes.rows.reduce((acc, row) => {
        acc[String(row.examen_id)] = Number(row.tarifa_acordada || 0);
        return acc;
      }, {});
    }

    const examenes = examenesRes.rows.map((examen) => ({
      ...examen,
      tarifa_convenio: Number(tarifaMap[String(examen.id)] ?? examen.tarifa_convenio ?? examen.tarifa_soat_referencia ?? 0) || 0
    }));

    return res.json({
      sedes: sedesRes.rows,
      roles: rolesRes.rows,
      examenes
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al consultar costos: ' + error.message
    });
  }
};

const updateCostoCompat = async (req, res) => {
  const { endpoint, id } = req.params;
  const payload = req.body || {};
  const targetId = id || payload.id;

  try {
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint no especificado' });
    }

    if (endpoint === 'sedes') {
      const { arriendo, servicios, admin, mtto, volumen } = payload;

      if (!targetId) {
        return res.status(400).json({ error: 'Falta el id de la sede' });
      }

      const result = await pool.query(
        `UPDATE sedes
         SET arriendo_mensual = $1,
             servicios_publicos = $2,
             nomina_admin = $3,
             mantenimiento_otros = $4,
             volumen_mensual_esperado = $5
         WHERE id = $6
         RETURNING id, nombre, arriendo_mensual AS arriendo, servicios_publicos AS servicios, nomina_admin AS admin, mantenimiento_otros AS mtto, volumen_mensual_esperado AS volumen;`,
        [
          Number(arriendo) || 0,
          Number(servicios) || 0,
          Number(admin) || 0,
          Number(mtto) || 0,
          Number(volumen) || 1,
          targetId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Sede no encontrada' });
      }

      return res.json({ message: 'Sede actualizada exitosamente', data: result.rows[0] });
    }

    if (endpoint === 'personal') {
      const { sueldo_base, prov_pct, horas_mes } = payload;

      if (!targetId) {
        return res.status(400).json({ error: 'Falta el id del rol' });
      }

      const result = await pool.query(
        `UPDATE personal_cargos
         SET sueldo_base = $1,
             porcentaje_provisiones = $2,
             horas_mes = $3
         WHERE id = $4
         RETURNING id, cargo AS nombre, cargo, sueldo_base, porcentaje_provisiones AS prov_pct, horas_mes;`,
        [
          Number(sueldo_base) || 0,
          Number(prov_pct) || 0,
          Number(horas_mes) || 1,
          targetId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      return res.json({ message: 'Rol actualizado exitosamente', data: result.rows[0] });
    }

    return res.status(404).json({ error: 'Endpoint legado no soportado' });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al actualizar costos: ' + error.message
    });
  }
};

module.exports = {
  getCostosCompat,
  updateCostoCompat
};
