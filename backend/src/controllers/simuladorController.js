const pool = require('../config/db');
const { calcularCostoMinuto, calcularCostoExamen, calcularBolsaFijaSede } = require('../services/costEngine');
const formulaConfigService = require('../services/formulaConfigService');
const costingDataService = require('../services/costingDataService');

const resolveConvenioId = async (convenioId) => {
  const id = convenioId !== undefined && convenioId !== null && convenioId !== '' ? Number(convenioId) : null;
  if (id) return id;

  const generalConvenio = await pool.query(`
    SELECT id FROM convenios WHERE LOWER(TRIM(nombre_eps)) = 'general' LIMIT 1;
  `);
  return generalConvenio.rows[0]?.id ?? null;
};

const getTarifaConvenioMap = async (convenioId) => {
  const selectedConvenioId = await resolveConvenioId(convenioId);
  if (!selectedConvenioId) return {};

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

  if (!sedeId) {
    return res.status(400).json({ error: 'Debe especificar el id de la sede para la simulación' });
  }

  try {
    const activeConfig = await formulaConfigService.readActiveFormulaConfig();
    const costingConfig = activeConfig.config;

    // 1. Obtener datos base de la Sede
    const sedeRes = await pool.query(`
      SELECT
        id,
        nombre,
        capacidad_sala_minutos,
        COALESCE(arriendo_mensual, 0) AS arriendo,
        COALESCE(servicios_publicos, 0) AS servicios,
        COALESCE((
          SELECT SUM(p.cantidad * p.sueldo_base * (1 + p.porcentaje_provisiones / 100))
          FROM personal_sede p
          WHERE p.sede_id = sedes.id AND p.grupo_costeo = 'administrativo'
        ), 0) AS admin,
        COALESCE(mantenimiento_otros, 0) AS mtto,
        COALESCE(volumen_mensual_esperado, 0) AS volumen
      FROM sedes
      WHERE id::text = $1 OR LOWER(nombre) LIKE LOWER('%' || $1 || '%')
      LIMIT 1;
    `, [String(sedeId)]);

    if (sedeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    const sedeBase = sedeRes.rows[0];
    // Aplicar ajustes de simulación sobre la Sede
    const sedeSimulada = {
      ...sedeBase,
      ...(ajustesSede || {})
    };
    const totalFijoSimulado = calcularBolsaFijaSede(sedeSimulada, costingConfig);
    const [areaBasedDistribution, equipmentCosts] = await Promise.all([
      costingDataService.cargarDistribucionAreas(sedeBase.id, totalFijoSimulado, costingConfig),
      costingDataService.cargarCostosEquiposRegistrados(sedeBase.id)
    ]);
    sedeSimulada.costoFijoBolsa = totalFijoSimulado;
    sedeSimulada.areaBasedDistribution = areaBasedDistribution;

    // 3. Obtener Roles y aplicar simulaciones
    const rolesRes = await pool.query(`
      SELECT grupo_costeo, cantidad, sueldo_base, porcentaje_provisiones, horas_mes
      FROM personal_sede
      WHERE sede_id = $1 AND grupo_costeo IN ('medico', 'asistencial')
    `, [sedeBase.id]);

    const rolesMap = {};
    for (const group of ['medico', 'asistencial']) {
      const groupRows = rolesRes.rows.filter((row) => row.grupo_costeo === group);
      const adjustment = (ajustesRoles && ajustesRoles[group]) || {};
      const monthlyCost = groupRows.reduce((total, row) => {
        const rate = calcularCostoMinuto(row.sueldo_base, row.porcentaje_provisiones, row.horas_mes, costingConfig.labor);
        return total + (rate === null ? 0 : Number(row.cantidad) * rate * Number(row.horas_mes) * costingConfig.labor.minutesPerHour);
      }, 0);
      const productiveMinutes = groupRows.reduce((total, row) => total + Number(row.cantidad) * Number(row.horas_mes) * costingConfig.labor.minutesPerHour, 0);
      rolesMap[group] = adjustment.costo_minuto !== undefined
        ? Number(adjustment.costo_minuto)
        : productiveMinutes > 0 ? monthlyCost / productiveMinutes : null;
    }

    // 4. Obtener Exámenes y aplicar simulaciones
    const examenesRes = await pool.query(`
      SELECT
        e.id,
        e.nombre,
        COALESCE(e.minutos_medico, 0) AS min_medico,
        COALESCE(e.minutos_asistencial, 0) AS min_asis,
        COALESCE(e.minutos_medico, 0) + COALESCE(e.minutos_asistencial, 0) AS duracion_minutos,
        e.capacidad_sala_minutos,
        COALESCE(i.costo_insumos_detalle, e.costo_insumos_directos, 0) AS insumos,
        COALESCE(e.costo_depreciacion_equipos, 0) AS cips,
        er.valor_compra AS equipo_valor_compra,
        er.vida_util_meses AS equipo_vida_util_meses,
        er.costo_mantenimiento_anual AS equipo_mantenimiento_anual,
        er.minutos_disponibles_mes AS equipo_minutos_disponibles_mes,
        er.tiempo_uso_minutos AS equipo_tiempo_uso_minutos,
        e.tarifa_soat_referencia,
        v.volumen_mes AS vol_mes,
        COALESCE(v.estimado, FALSE) AS volumen_estimado,
        e.volumen_mes_proyectado AS volumen_red
      FROM examenes e
      LEFT JOIN (
        SELECT examen_id, SUM(cantidad * valor_unitario) AS costo_insumos_detalle
        FROM insumos_detalle
        WHERE sede_id = $2
        GROUP BY examen_id
      ) i ON i.examen_id = e.id
      LEFT JOIN volumen_sede_examen v
        ON v.examen_id = e.id AND v.sede_id = $1
      LEFT JOIN equipos_costo_referencia er ON er.examen_id = e.id
      ORDER BY e.id ASC;
    `, [sedeBase.id, sedeBase.id]);

    const tarifaConvenioMap = await getTarifaConvenioMap(convenioId);

    const resultadosSimulados = examenesRes.rows.map((examen) => {
      const ajusteExamen = (ajustesExamenes && ajustesExamenes[examen.id]) || {};
      const tarifaConvenio = Object.hasOwn(tarifaConvenioMap, String(examen.id))
        ? tarifaConvenioMap[String(examen.id)]
        : null;

      const examenSimulado = {
        ...examen,
        ...(equipmentCosts[String(examen.id)] || {}),
        tarifa_convenio: tarifaConvenio,
        ...ajusteExamen
      };

      const calculo = calcularCostoExamen(examenSimulado, rolesMap, sedeSimulada, costingConfig);
      const volumenSede = examenSimulado.vol_mes === null || examenSimulado.vol_mes === undefined
        ? null
        : Number(examenSimulado.vol_mes);

      return {
        examenId: examen.id,
        nombre: examen.nombre || `Examen #${examen.id}`,
        min_medico: Number(examenSimulado.min_medico),
        min_asis: Number(examenSimulado.min_asis),
        duracion_minutos: Number(calculo.duracionMinutos),
        insumos: Number(calculo.costoInsumos),
        cips: Number(calculo.costoCips),
        vol_mes: volumenSede,
        volumen: volumenSede,
        volumen_estimado: Boolean(examen.volumen_estimado),
        tarifaConvenio: calculo.tarifaAplicada,
        ...calculo
      };
    });
    const calculosIncompletos = resultadosSimulados.filter((examen) => examen.datosFaltantes.length > 0);
    if (calculosIncompletos.length > 0) {
      return res.status(409).json({
        error: `Simulación incompleta para ${calculosIncompletos.length} exámenes. Revise los datos indicados.`,
        faltantes: calculosIncompletos.map(({ examenId, nombre, datosFaltantes }) => ({ examenId, examen: nombre, campos: datosFaltantes }))
      });
    }

    res.json({
      mensaje: 'Proyección simulada con éxito',
      sedeId: sedeBase.id,
      nombreSede: sedeBase.nombre,
      formulaVersionId: activeConfig.id,
      formulaVersionName: activeConfig.nombre,
      allocationMethod: costingConfig.fixedCost.allocationMethod,
      costoFijoBolsa: totalFijoSimulado,
      distribucionAreas: areaBasedDistribution,
      evaluacion: resultadosSimulados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al simular el escenario: ' + error.message });
  }
};

module.exports = { simularEscenario };