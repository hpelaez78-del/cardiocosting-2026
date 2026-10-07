const test = require('node:test');
const assert = require('node:assert/strict');

const { calcularCostoMinuto, calcularCostoExamen } = require('../src/services/costEngine');

test('calcula el costo minuto con provisiones y horas reales', () => {
  const rate = calcularCostoMinuto(8500000, 52, 160);
  assert.ok(Math.abs(rate - 1345.8333333333333) < 0.000001);
  assert.equal(calcularCostoMinuto(8500000, 52, 0), null);
});

test('distribuye la bolsa fija por duración y conserva una tarifa contractual cero', () => {
  const result = calcularCostoExamen(
    {
      min_medico: 10,
      min_asis: 20,
      insumos: 1000,
      cips: 500,
      tarifa_convenio: 0,
      tarifa_soat_referencia: 50000
    },
    { medico: 100, asistencial: 50 },
    { arriendo: 2000000, capacidad_sala_minutos: 2000 }
  );

  assert.equal(result.costoPersonal, 2000);
  assert.equal(result.costoFijoProrrateado, 30000);
  assert.equal(result.costoTotal, 33500);
  assert.equal(result.utilidad, -33500);
  assert.deepEqual(result.datosFaltantes, []);
});

test('no publica un costo completo si falta capacidad de sala o tarifa de personal', () => {
  const result = calcularCostoExamen(
    { min_medico: 10, min_asis: 0, insumos: 100, cips: 0, tarifa_soat_referencia: 50000 },
    { medico: null },
    { arriendo: 1000000, capacidad_sala_minutos: 0 }
  );

  assert.equal(result.costoFijoProrrateado, null);
  assert.equal(result.costoTotal, null);
  assert.deepEqual(result.datosFaltantes, ['capacidad_sala_minutos', 'costo_personal']);
});

test('marks profitability incomplete when no convenio or SOAT tariff exists', () => {
  const result = calcularCostoExamen(
    { min_medico: 0, min_asis: 15, tarifa_soat_referencia: 0, capacidad_sala_minutos: 1000 },
    { asistencial: 1 },
    { capacidad_sala_minutos: 1000 }
  );

  assert.equal(result.utilidad, null);
  assert.deepEqual(result.datosFaltantes, ['tarifa']);
});

test('uses the exam room capacity instead of a legacy site capacity', () => {
  const result = calcularCostoExamen(
    {
      min_medico: 0,
      min_asis: 10,
      capacidad_sala_minutos: 100,
      tarifa_convenio: 0
    },
    { asistencial: 0 },
    { arriendo: 1000, capacidad_sala_minutos: 1000 }
  );

  assert.equal(result.costoFijoProrrateado, 100);
  assert.deepEqual(result.datosFaltantes, []);
});

test('applies global provisions, concurrent duration and selected fixed-cost components', () => {
  const globalRate = calcularCostoMinuto(1000, 0, 10, {
    provisionsMode: 'global',
    provisionsPct: 50,
    minutesPerHour: 60
  });
  assert.equal(globalRate, 2.5);

  const result = calcularCostoExamen(
    { id: 'test', min_medico: 15, min_asis: 10, capacidad_sala_minutos: 1000, tarifa_convenio: 0, tarifa_soat_referencia: 10000 },
    { medico: 10, asistencial: 5 },
    { arriendo: 100000, servicios: 20000, admin: 30000, mtto: 40000 },
    {
      duration: { defaultMode: 'sequential_sum', examModes: { test: 'concurrent_max' } },
      fixedCost: { includeRent: true, includeServices: false, includeAdminPayroll: false, includeMaintenance: false },
      supplies: { includeInCost: true },
      equipment: { includeDepreciation: true, includeMaintenance: true },
      tariff: { useSoatWhenContractMissing: true, honorZeroContracted: true }
    }
  );

  assert.equal(result.duracionMinutos, 15);
  assert.equal(result.costoFijoProrrateado, 1500);
  assert.equal(result.utilidad, -1700);
});

test('uses SOAT for a zero contracted tariff only when configured to do so', () => {
  const result = calcularCostoExamen(
    { min_medico: 0, min_asis: 10, capacidad_sala_minutos: 1000, tarifa_convenio: 0, tarifa_soat_referencia: 5000 },
    { asistencial: 1 },
    {},
    { tariff: { honorZeroContracted: false, useSoatWhenContractMissing: true } }
  );

  assert.equal(result.utilidad, 5000 - 10);
});
