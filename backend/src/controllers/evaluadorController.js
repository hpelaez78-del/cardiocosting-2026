const pool = require('../config/db');
const { calcularCostoMinuto, calcularCostoExamen } = require('../services/costEngine');

const resolveConvenioId = async (convenioId) => {
  const id = convenioId !== undefined && convenioId !== null && convenioId !== '' ? Number(convenioId) : null;
  if (id) {
    return id;
  }

  const generalConvenio = await pool.query(`
    SELECT id
    FROM convenios
    WHERE LOWER(TRIM(nombre_eps)) = 'general'
    LIMIT 1;
  `);

  return generalConvenio.rows[0]?.id ?? null;
};

const getTarifaConvenioMap = async (convenioId) => {
  const selectedConvenioId = await resolveConvenioId(convenioId);

  if (!selectedConvenioId) {
    return {};
  }

  const tarifaRes = await pool.query(`
    SELECT examen_id, tarifa_acordada
    FROM tarifas_convenios
    WHERE convenio_id = $1;
  `, [selectedConvenioId]);

  return tarifaRes.rows.reduce((acc, row) => {
    acc[String(row.examen_id)] = Number(row.tarifa_acordada || 0);
    return acc;
  }, {});
};

const evaluarSede = async (req, res) => {
  const { sedeId } = req.params;
  const convenioId = req.query.convenioId || req.query.convenio || null;

  try {
    const sedeRes = await pool.query(`
      SELECT
        id,
        nombre,
        arriendo_mensual AS arriendo,
        servicios_publicos AS servicios,
        nomina_admin AS admin,
        mantenimiento_otros AS mtto,
        volumen_mensual_esperado AS volumen
      FROM sedes
      WHERE id = $1;
    `, [sedeId]);

    if (sedeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    const sede = sedeRes.rows[0];

    const rolesRes = await pool.query(`
      SELECT
        id,
        cargo AS nombre,
        sueldo_base,
        porcentaje_provisiones AS prov_pct,
        horas_mes
      FROM personal_cargos;
    `);

    const examenesRes = await pool.query(`
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
    `);

    const rolesMap = {};
    rolesRes.rows.forEach((rol) => {
      const claveRol = String(rol.id || rol.nombre || '').toLowerCase();
      rolesMap[claveRol] = calcularCostoMinuto(
        Number(rol.sueldo_base) || 0,
        Number(rol.prov_pct) || 0,
        Number(rol.horas_mes) || 1
      );
      if (rol.id === 'medico') rolesMap.medico = rolesMap[claveRol];
      if (rol.id === 'asistencial') rolesMap.asistencial = rolesMap[claveRol];
    });

    const tarifaConvenioMap = await getTarifaConvenioMap(convenioId);

    const evaluacion = examenesRes.rows.map((examen) => {
      const tarifaConvenio = Number(
        tarifaConvenioMap[String(examen.id)] ?? examen.tarifa_convenio ?? examen.tarifa_soat_referencia ?? 0
      ) || 0;

      const examenConTarifa = {
        ...examen,
        tarifa_convenio: tarifaConvenio
      };

      const calculo = calcularCostoExamen(examenConTarifa, rolesMap, sede);
      return {
        examenId: examen.id,
        nombre: examen.nombre || `Examen #${examen.id}`,
        tarifaConvenio,
        ...calculo
      };
    });

    res.json({
      sedeId: sede.id,
      nombreSede: sede.nombre || `Sede #${sede.id}`,
      evaluacion
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al evaluar la sede: ' + error.message });
  }
};

module.exports = {
  evaluarSede
};