const db = require('../config/db');
const { resolverSedeId } = require('./sedesController');
const { calcularCostoMinuto, calcularCostoExamen, calcularBolsaFijaSede } = require('../services/costEngine');
const formulaConfigService = require('../services/formulaConfigService');
const costingDataService = require('../services/costingDataService');

const evaluarSede = async (req, res, next) => {
  try {
    const { sedeId } = req.params;
    const { convenioId } = req.query;

    const idSede = await resolverSedeId(sedeId);
    if (!idSede) return res.status(404).json({ error: 'Sede no encontrada' });

    let selectedConvenioId = convenioId;
    if (!selectedConvenioId) {
      const convenioRes = await db.query(`
        SELECT id FROM convenios
        WHERE LOWER(TRIM(nombre_eps)) = 'general'
        LIMIT 1;
      `);
      selectedConvenioId = convenioRes.rows[0]?.id || null;
    }
    const activeConfig = await formulaConfigService.readActiveFormulaConfig();
    const costingConfig = activeConfig.config;

    const [result, sedeRes] = await Promise.all([
      db.query(`
        SELECT e.*,
               COALESCE(e.minutos_medico, 0) AS min_medico,
               COALESCE(e.minutos_asistencial, 0) AS min_asis,
               COALESCE(e.minutos_medico, 0) + COALESCE(e.minutos_asistencial, 0) AS duracion_minutos,
               v.volumen_mes AS volumen,
               COALESCE(v.estimado, FALSE) AS volumen_estimado,
               e.volumen_mes_proyectado AS volumen_red,
               COALESCE(i.costo_insumos_detalle, e.costo_insumos_directos, 0) AS insumos,
               COALESCE(e.costo_depreciacion_equipos, 0) AS cips,
               er.valor_compra AS equipo_valor_compra,
               er.vida_util_meses AS equipo_vida_util_meses,
               er.costo_mantenimiento_anual AS equipo_mantenimiento_anual,
               er.minutos_disponibles_mes AS equipo_minutos_disponibles_mes,
               er.tiempo_uso_minutos AS equipo_tiempo_uso_minutos,
               tc.tarifa_acordada AS tarifa_convenio
        FROM examenes e
        LEFT JOIN (
          SELECT examen_id, SUM(cantidad * valor_unitario) AS costo_insumos_detalle
          FROM insumos_detalle
          WHERE sede_id = $2
          GROUP BY examen_id
        ) i ON i.examen_id = e.id
        LEFT JOIN tarifas_convenios tc
          ON tc.examen_id = e.id AND tc.convenio_id = $1
        LEFT JOIN volumen_sede_examen v
          ON v.examen_id = e.id AND v.sede_id = $2
        LEFT JOIN equipos_costo_referencia er ON er.examen_id = e.id
        ORDER BY e.id ASC;
      `, [selectedConvenioId, idSede]),
      db.query(`
         SELECT s.arriendo_mensual, s.servicios_publicos, s.mantenimiento_otros,
           s.capacidad_sala_minutos,
           s.volumen_mensual_esperado,
               COALESCE(p.nomina_admin_detallada, 0) AS nomina_admin,
               COALESCE(s.arriendo_mensual, 0) + COALESCE(s.servicios_publicos, 0)
               + COALESCE(p.nomina_admin_detallada, 0) + COALESCE(s.mantenimiento_otros, 0) AS costo_fijo_bolsa
        FROM sedes s
        LEFT JOIN (
          SELECT sede_id, SUM(cantidad * sueldo_base * (1 + porcentaje_provisiones / 100)) AS nomina_admin_detallada
          FROM personal_sede
          WHERE grupo_costeo = 'administrativo'
          GROUP BY sede_id
        ) p ON p.sede_id = s.id
        WHERE s.id = $1;
      `, [idSede])
    ]);

      const sede = sedeRes.rows[0];
      const rolesRes = await db.query(`
        SELECT grupo_costeo, cantidad, sueldo_base, porcentaje_provisiones, horas_mes
        FROM personal_sede
        WHERE sede_id = $1 AND grupo_costeo IN ('medico', 'asistencial')
      `, [idSede]);
      const rolesMap = {};
      for (const group of ['medico', 'asistencial']) {
        const groupRows = rolesRes.rows.filter((row) => row.grupo_costeo === group);
        const monthlyCost = groupRows.reduce((total, row) => {
          const costMinute = calcularCostoMinuto(row.sueldo_base, row.porcentaje_provisiones, row.horas_mes, costingConfig.labor);
          return total + (costMinute === null ? 0 : Number(row.cantidad) * costMinute * Number(row.horas_mes) * costingConfig.labor.minutesPerHour);
        }, 0);
        const productiveMinutes = groupRows.reduce((total, row) => total + Number(row.cantidad) * Number(row.horas_mes) * costingConfig.labor.minutesPerHour, 0);
        rolesMap[group] = productiveMinutes > 0 ? monthlyCost / productiveMinutes : null;
      }

      const sedeCostos = {
        ...sede,
        costoFijoBolsa: calcularBolsaFijaSede(sede, costingConfig),
      };
      const [areaBasedDistribution, equipmentCosts] = await Promise.all([
        costingDataService.cargarDistribucionAreas(idSede, sedeCostos.costoFijoBolsa, costingConfig),
        costingDataService.cargarCostosEquiposRegistrados(idSede)
      ]);
      sedeCostos.areaBasedDistribution = areaBasedDistribution;
      const datosExamenes = result.rows.map((row) => {
        const examen = { ...row, ...(equipmentCosts[String(row.id)] || {}) };
        const costo = calcularCostoExamen(examen, rolesMap, sedeCostos, costingConfig);
        return { ...examen, ...costo };
      });
      const calculosIncompletos = datosExamenes.filter((examen) => examen.datosFaltantes.length > 0);
      if (calculosIncompletos.length > 0) {
        return res.status(409).json({
          error: `Costeo incompleto para ${calculosIncompletos.length} exámenes. Revise los datos indicados.`,
          faltantes: calculosIncompletos.map(({ id, nombre, datosFaltantes }) => ({ examenId: id, examen: nombre, campos: datosFaltantes }))
        });
      }

    res.json({
      sedeId: idSede,
      convenioId: selectedConvenioId,
      formulaVersionId: activeConfig.id,
      formulaVersionName: activeConfig.nombre,
      allocationMethod: costingConfig.fixedCost.allocationMethod,
      tasasMinuto: rolesMap,
        costoFijoBolsa: sedeCostos.costoFijoBolsa,
      resumen: {
        totalExamenes: datosExamenes.length,
        estado: 'Evaluación ejecutada exitosamente'
      },
      examenes: datosExamenes,
      evaluacion: datosExamenes,
      distribucionAreas: areaBasedDistribution
    });
  } catch (error) {
    console.error('[ERROR EVALUADOR]', error.message);
    next(error);
  }
};

const obtenerConsolidadoMultisitio = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM sedes ORDER BY id ASC');
    res.json({ mensaje: 'Consolidado multisitio generado', sedes: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluarSede,
  getEvaluacionSede: evaluarSede,
  obtenerEvaluacionSede: evaluarSede,
  obtenerConsolidadoMultisitio
};