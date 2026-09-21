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

const simularEscenario = async (req, res) => {
  const { sedeId, ajustesSede, ajustesRoles, ajustesExamenes, convenioId } = req.body || {};

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

    const sedeBase = sedeRes.rows[0];
    const sedeSimulada = {
      ...sedeBase,
      ...(ajustesSede || {})
    };

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
      const ajuste = (ajustesRoles && ajustesRoles[claveRol]) || {};

      const sueldo = ajuste.sueldo_base !== undefined ? ajuste.sueldo_base : rol.sueldo_base;
      const prov = ajuste.prov_pct !== undefined ? ajuste.prov_pct : rol.prov_pct;
      const horas = ajuste.horas_mes !== undefined ? ajuste.horas_mes : rol.horas_mes;

      rolesMap[claveRol] = calcularCostoMinuto(Number(sueldo), Number(prov), Number(horas));
      if (rol.id === 'medico') rolesMap.medico = rolesMap[claveRol];
      if (rol.id === 'asistencial') rolesMap.asistencial = rolesMap[claveRol];
    });

    const tarifaConvenioMap = await getTarifaConvenioMap(convenioId);

    const resultadosSimulados = examenesRes.rows.map((examen) => {
      const ajusteExamen = (ajustesExamenes && ajustesExamenes[examen.id]) || {};
      const tarifaConvenio = Number(
        tarifaConvenioMap[String(examen.id)] ?? examen.tarifa_convenio ?? examen.tarifa_soat_referencia ?? 0
      ) || 0;
      const examenSimulado = {
        ...examen,
        tarifa_convenio: tarifaConvenio,
        ...ajusteExamen
      };
      const calculo = calcularCostoExamen(examenSimulado, rolesMap, sedeSimulada);

      return {
        examenId: examen.id,
        nombre: examen.nombre || `Examen #${examen.id}`,
        tarifaConvenio,
        calculoSimulado: calculo
      };
    });

    res.json({
      mensaje: 'Proyección simulada con éxito',
      sedeId,
      resultados: resultadosSimulados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al simular el escenario: ' + error.message });
  }
};

module.exports = {
  simularEscenario
};