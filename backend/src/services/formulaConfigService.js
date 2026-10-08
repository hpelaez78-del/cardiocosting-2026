const db = require('../config/db');
const costingDataService = require('./costingDataService');

const MODES_DURATION = ['sequential_sum', 'concurrent_max'];
const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const readActiveFormulaConfig = async () => {
  const result = await db.query(`
    SELECT id, nombre, config, created_at
    FROM costing_formula_versions
    WHERE activa = TRUE
    ORDER BY id DESC
    LIMIT 1;
  `);
  if (!result.rows[0]) throw new Error('No hay una versión activa de configuración de costeo');
  return { ...result.rows[0], config: normalizeFormulaConfig(result.rows[0].config) };
};

const normalizeFormulaConfig = (config) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw validationError('La configuración debe ser un objeto');
  }

  const labor = config.labor || {};
  const duration = config.duration || {};
  const fixedCost = config.fixedCost || {};
  const supplies = config.supplies || {};
  const equipment = config.equipment || {};
  const tariff = config.tariff || {};

  const provisionsMode = labor.provisionsMode ?? 'per_role';
  const provisionsPct = Number(labor.provisionsPct ?? 48.5);
  const minutesPerHour = Number(labor.minutesPerHour ?? 60);
  const defaultMode = duration.defaultMode ?? 'sequential_sum';
  const allocationMethod = fixedCost.allocationMethod ?? 'practical_capacity';
  const examModes = duration.examModes ?? {};

  if (!['per_role', 'global'].includes(provisionsMode)) throw validationError('Modo de provisiones inválido');
  if (!Number.isFinite(provisionsPct) || provisionsPct < 0 || provisionsPct > 100) throw validationError('El porcentaje de provisiones debe estar entre 0 y 100');
  if (!Number.isFinite(minutesPerHour) || minutesPerHour <= 0 || minutesPerHour > 120) throw validationError('Los minutos por hora deben ser mayores que cero');
  if (!MODES_DURATION.includes(defaultMode)) throw validationError('Modo de duración inválido');
  if (!['practical_capacity', 'per_procedure', 'area_based'].includes(allocationMethod)) throw validationError('Método de distribución fija inválido');
  if (!examModes || typeof examModes !== 'object' || Array.isArray(examModes)) throw validationError('Los modos por examen deben ser un objeto');
  for (const mode of Object.values(examModes)) {
    if (!MODES_DURATION.includes(mode)) throw validationError('Hay un modo de duración por examen inválido');
  }

  const booleans = [
    fixedCost.includeRent,
    fixedCost.includeServices,
    fixedCost.includeAdminPayroll,
    fixedCost.includeMaintenance,
    supplies.includeInCost,
    equipment.includeDepreciation,
    equipment.includeMaintenance,
    tariff.useSoatWhenContractMissing,
    tariff.honorZeroContracted
  ];
  if (booleans.some((value) => value !== undefined && typeof value !== 'boolean')) {
    throw validationError('Las opciones de inclusión deben ser booleanas');
  }

  return {
    labor: { provisionsMode, provisionsPct, minutesPerHour },
    duration: { defaultMode, examModes },
    fixedCost: {
      allocationMethod,
      includeRent: fixedCost.includeRent ?? true,
      includeServices: fixedCost.includeServices ?? true,
      includeAdminPayroll: fixedCost.includeAdminPayroll ?? true,
      includeMaintenance: fixedCost.includeMaintenance ?? true
    },
    supplies: { includeInCost: supplies.includeInCost ?? true },
    equipment: {
      includeDepreciation: equipment.includeDepreciation ?? true,
      includeMaintenance: equipment.includeMaintenance ?? true
    },
    tariff: {
      useSoatWhenContractMissing: tariff.useSoatWhenContractMissing ?? true,
      honorZeroContracted: tariff.honorZeroContracted ?? true
    }
  };
};

const readFormulaVersions = async () => {
  const result = await db.query(`
    SELECT id, nombre, activa, created_at, created_by
    FROM costing_formula_versions
    ORDER BY id DESC
    LIMIT 25;
  `);
  return result.rows;
};

const createFormulaVersion = async ({ nombre, config, userId }) => {
  const normalized = normalizeFormulaConfig(config);
  if (normalized.fixedCost.allocationMethod === 'area_based') {
    const missing = await costingDataService.validarCoberturaAreaBased(normalized);
    if (missing.length > 0) {
      throw Object.assign(new Error('No se puede activar area_based: complete capacidades y conciliación de todas las sedes.'), {
        statusCode: 400,
        details: missing
      });
    }
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE costing_formula_versions SET activa = FALSE WHERE activa = TRUE');
    const result = await client.query(`
      INSERT INTO costing_formula_versions (nombre, config, activa, created_by)
      VALUES ($1, $2::jsonb, TRUE, $3)
      RETURNING id, nombre, config, activa, created_at, created_by;
    `, [String(nombre || '').trim() || 'Configuración de costeo', JSON.stringify(normalized), userId || null]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const activateFormulaVersion = async (id) => {
  const versionRes = await db.query('SELECT config FROM costing_formula_versions WHERE id = $1;', [id]);
  if (!versionRes.rows[0]) throw Object.assign(new Error('Versión de costeo no encontrada'), { statusCode: 404 });
  const normalized = normalizeFormulaConfig(versionRes.rows[0].config);
  if (normalized.fixedCost.allocationMethod === 'area_based') {
    const missing = await costingDataService.validarCoberturaAreaBased(normalized);
    if (missing.length > 0) {
      throw Object.assign(new Error('No se puede activar area_based: complete capacidades y conciliación de todas las sedes.'), {
        statusCode: 400,
        details: missing
      });
    }
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE costing_formula_versions SET activa = FALSE WHERE activa = TRUE');
    const result = await client.query(`
      UPDATE costing_formula_versions
      SET activa = TRUE
      WHERE id = $1
      RETURNING id, nombre, config, activa, created_at, created_by;
    `, [id]);
    if (!result.rowCount) throw Object.assign(new Error('Versión de costeo no encontrada'), { statusCode: 404 });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  readActiveFormulaConfig,
  readFormulaVersions,
  normalizeFormulaConfig,
  createFormulaVersion,
  activateFormulaVersion
};
