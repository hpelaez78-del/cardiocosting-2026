const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFormulaConfig } = require('../src/services/formulaConfigService');

test('normaliza parámetros permitidos de la configuración de costeo', () => {
  const config = normalizeFormulaConfig({
    labor: { provisionsMode: 'global', provisionsPct: 48.5, minutesPerHour: 60 },
    duration: { defaultMode: 'concurrent_max', examModes: { eco_tt: 'sequential_sum' } },
    fixedCost: { includeRent: true, includeServices: false },
    tariff: { honorZeroContracted: true }
  });

  assert.equal(config.labor.provisionsMode, 'global');
  assert.equal(config.duration.defaultMode, 'concurrent_max');
  assert.equal(config.fixedCost.includeServices, false);
  assert.equal(config.fixedCost.allocationMethod, 'practical_capacity');
  assert.equal(config.supplies.includeInCost, true);
});

test('acepta area_based sin cambiar la opción predeterminada', () => {
  const config = normalizeFormulaConfig({
    fixedCost: { allocationMethod: 'area_based' }
  });

  assert.equal(config.fixedCost.allocationMethod, 'area_based');
  assert.throws(() => normalizeFormulaConfig({
    fixedCost: { allocationMethod: 'unknown' }
  }), /Método de distribución fija inválido/);
});

test('rechaza opciones inválidas antes de versionar la fórmula', () => {
  assert.throws(() => normalizeFormulaConfig({
    labor: { provisionsMode: 'arbitrary-code', provisionsPct: 48.5, minutesPerHour: 60 }
  }), /Modo de provisiones inválido/);

  assert.throws(() => normalizeFormulaConfig({
    labor: { provisionsMode: 'global', provisionsPct: 150, minutesPerHour: 60 }
  }), /porcentaje de provisiones/);
});
