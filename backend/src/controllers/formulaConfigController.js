const formulaConfigService = require('../services/formulaConfigService');
const db = require('../config/db');
const { resolverSedeId } = require('./sedesController');
const { calcularCostoMinuto, calcularCostoExamen, calcularBolsaFijaSede } = require('../services/costEngine');
const costingDataService = require('../services/costingDataService');

const getFormulaConfig = async (req, res, next) => {
  try {
    const [active, versions] = await Promise.all([
      formulaConfigService.readActiveFormulaConfig(),
      formulaConfigService.readFormulaVersions()
    ]);
    res.json({ active, versions });
  } catch (error) {
    next(error);
  }
};

const saveFormulaConfig = async (req, res, next) => {
  try {
    const { nombre, config } = req.body || {};
    const version = await formulaConfigService.createFormulaVersion({
      nombre,
      config,
      userId: req.user?.id
    });
    res.status(201).json({ message: 'Nueva versión de costeo activada', version });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message, faltantes: error.details || [] });
    next(error);
  }
};

const previewFormulaConfig = async (req, res, next) => {
  try {
    const { sedeId, examenId, convenioId, config } = req.body || {};
    if (!sedeId || !examenId) return res.status(400).json({ error: 'Seleccione sede y examen para la vista previa' });
    const normalizedConfig = formulaConfigService.normalizeFormulaConfig(config);
    const resolvedSedeId = await resolverSedeId(sedeId);
    if (!resolvedSedeId) return res.status(404).json({ error: 'Sede no encontrada' });

    const [siteResult, examResult, roleResult] = await Promise.all([
      db.query(`
         SELECT s.arriendo_mensual, s.servicios_publicos, s.mantenimiento_otros,
           s.capacidad_sala_minutos,
           s.arriendo_mensual AS arriendo,
           s.servicios_publicos AS servicios,
           s.mantenimiento_otros AS mtto,
           s.volumen_mensual_esperado,
               COALESCE(p.admin_payroll, 0) AS admin_payroll
        FROM sedes s
        LEFT JOIN (
          SELECT sede_id, SUM(cantidad * sueldo_base * (1 + porcentaje_provisiones / 100)) AS admin_payroll
          FROM personal_sede WHERE grupo_costeo = 'administrativo' GROUP BY sede_id
        ) p ON p.sede_id = s.id
        WHERE s.id = $1;
      `, [resolvedSedeId]),
      db.query(`
        SELECT e.id, e.minutos_medico AS min_medico, e.minutos_asistencial AS min_asis,
               e.capacidad_sala_minutos,
               COALESCE(i.costo_insumos, e.costo_insumos_directos, 0) AS insumos,
               e.tarifa_soat_referencia,
               tc.tarifa_acordada AS tarifa_convenio,
               er.valor_compra AS equipo_valor_compra,
               er.vida_util_meses AS equipo_vida_util_meses,
               er.costo_mantenimiento_anual AS equipo_mantenimiento_anual,
               er.minutos_disponibles_mes AS equipo_minutos_disponibles_mes,
               er.tiempo_uso_minutos AS equipo_tiempo_uso_minutos
        FROM examenes e
        LEFT JOIN (
          SELECT examen_id, SUM(cantidad * valor_unitario) AS costo_insumos
          FROM insumos_detalle WHERE sede_id = $2 GROUP BY examen_id
        ) i ON i.examen_id = e.id
        LEFT JOIN tarifas_convenios tc ON tc.examen_id = e.id AND tc.convenio_id = $3
        LEFT JOIN equipos_costo_referencia er ON er.examen_id = e.id
        WHERE e.id = $1;
      `, [examenId, resolvedSedeId, convenioId || null]),
      db.query(`
        SELECT grupo_costeo, cantidad, sueldo_base, porcentaje_provisiones, horas_mes
        FROM personal_sede
        WHERE sede_id = $1 AND grupo_costeo IN ('medico', 'asistencial');
      `, [resolvedSedeId])
    ]);

    if (!siteResult.rows[0] || !examResult.rows[0]) return res.status(404).json({ error: 'Sede o examen no encontrado' });

    const rolesMap = {};
    for (const group of ['medico', 'asistencial']) {
      const rows = roleResult.rows.filter((row) => row.grupo_costeo === group);
      const monthlyCost = rows.reduce((total, row) => {
        const rate = calcularCostoMinuto(row.sueldo_base, row.porcentaje_provisiones, row.horas_mes, normalizedConfig.labor);
        return total + (rate === null ? 0 : Number(row.cantidad) * rate * Number(row.horas_mes) * normalizedConfig.labor.minutesPerHour);
      }, 0);
      const minutes = rows.reduce((total, row) => total + Number(row.cantidad) * Number(row.horas_mes) * normalizedConfig.labor.minutesPerHour, 0);
      rolesMap[group] = minutes > 0 ? monthlyCost / minutes : null;
    }

    const site = siteResult.rows[0];
    const [areaBasedDistribution, equipmentCosts] = await Promise.all([
      costingDataService.cargarDistribucionAreas(
        resolvedSedeId,
        calcularBolsaFijaSede({ ...site, admin: site.admin_payroll }, normalizedConfig),
        normalizedConfig
      ),
      costingDataService.cargarCostosEquiposRegistrados(resolvedSedeId)
    ]);
    const exam = { ...examResult.rows[0], ...(equipmentCosts[String(examResult.rows[0].id)] || {}) };
    const costs = calcularCostoExamen(exam, rolesMap, {
      ...site,
      admin: Number(site.admin_payroll),
      capacidadSalaMinutos: Number(site.capacidad_sala_minutos),
      costoFijoBolsa: calcularBolsaFijaSede({ ...site, admin: site.admin_payroll }, normalizedConfig),
      areaBasedDistribution
    }, normalizedConfig);
    res.json({ sedeId: resolvedSedeId, examenId, costs, rates: rolesMap, distribucionAreas: areaBasedDistribution });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
};

const activateFormulaVersion = async (req, res, next) => {
  try {
    const version = await formulaConfigService.activateFormulaVersion(req.params.id);
    res.json({ message: 'Versión de costeo restaurada', version });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    if (error.statusCode === 400) return res.status(400).json({ error: error.message, faltantes: error.details || [] });
    next(error);
  }
};

module.exports = { getFormulaConfig, saveFormulaConfig, previewFormulaConfig, activateFormulaVersion };
