/**
 * Motor de cálculos financieros para Cardiocosting bajo metodología TDABC
 */

const calcularCostoMinuto = (sueldoBase, provPct, horasMes, config = {}) => {
  const sueldo = Number(sueldoBase);
  const prov = config.provisionsMode === 'global'
    ? Number(config.provisionsPct)
    : Number(provPct);
  const horas = Number(horasMes);
  const minutesPerHour = Number(config.minutesPerHour ?? 60);

  if (![sueldo, prov, horas, minutesPerHour].every(Number.isFinite) || sueldo < 0 || prov < 0 || horas <= 0 || minutesPerHour <= 0) {
    return null;
  }
  const sueldoTotal = sueldo * (1 + prov / 100);
  const costoHora = sueldoTotal / horas;
  return costoHora / minutesPerHour;
};

const calcularCostoExamen = (examen, rolesMap, sede, config = {}) => {
  const minMedico = Number(examen.min_medico ?? examen.minutos_medico ?? 0) || 0;
  const minAsistencial = Number(examen.min_asis ?? examen.minutos_asistencial ?? 0) || 0;
  const durationMode = config.duration?.examModes?.[examen.id] || config.duration?.defaultMode || 'sequential_sum';
  const duracionMinutos = durationMode === 'concurrent_max'
    ? Math.max(minMedico, minAsistencial)
    : minMedico + minAsistencial;
  const duracionValida = Number.isFinite(duracionMinutos) && duracionMinutos > 0;

  const costoMedico = minMedico * (Number(rolesMap.medico) || 0);
  const costoAsistencial = minAsistencial * (Number(rolesMap.asistencial) || 0);
  const tarifaMedicoValida = minMedico === 0 || (rolesMap.medico !== null && rolesMap.medico !== undefined && Number.isFinite(Number(rolesMap.medico)));
  const tarifaAsistencialValida = minAsistencial === 0 || (rolesMap.asistencial !== null && rolesMap.asistencial !== undefined && Number.isFinite(Number(rolesMap.asistencial)));
  const costoPersonalTotal = tarifaMedicoValida && tarifaAsistencialValida
    ? costoMedico + costoAsistencial
    : null;

  // Gastos Fijos de la Sede o Sub-bolsa
  const fixedConfig = config.fixedCost || {};
  const totalComponentes =
    (fixedConfig.includeRent === false ? 0 : Number(sede.arriendo ?? sede.arriendo_mensual ?? 0)) +
    (fixedConfig.includeServices === false ? 0 : Number(sede.servicios ?? sede.servicios_publicos ?? 0)) +
    (fixedConfig.includeAdminPayroll === false ? 0 : Number(sede.admin ?? sede.nomina_admin ?? 0)) +
    (fixedConfig.includeMaintenance === false ? 0 : Number(sede.mtto ?? sede.mantenimiento_otros ?? 0));

  const bolsaAsignada = Number(sede.costoFijoBolsa ?? sede.costo_fijo_bolsa ?? 0);
  const gastosFijosSede = config.fixedCost ? totalComponentes : (bolsaAsignada > 0 ? bolsaAsignada : totalComponentes);

  // --- TDABC: Asignación basada en Capacidad en Minutos ---
  const capacidadMinutosMes = Number(
    examen.capacidad_sala_minutos ?? sede.capacidad_sala_minutos ?? sede.capacidadSalaMinutos ?? sede.minutos_disponibles_mes ?? sede.capacidad_minutos ?? 0
  );

  const allocationMethod = config.fixedCost?.allocationMethod || 'practical_capacity';
  const volumenSede = Number(sede.volumen_mensual_esperado ?? sede.volumen ?? 0);
  const costoMinutoFijoSede = capacidadMinutosMes > 0 ? gastosFijosSede / capacidadMinutosMes : null;
  const costoFijoProrrateado = allocationMethod === 'per_procedure'
    ? volumenSede > 0 ? gastosFijosSede / volumenSede : null
    : costoMinutoFijoSede !== null && duracionValida ? duracionMinutos * costoMinutoFijoSede : null;

  const costoInsumos = config.supplies?.includeInCost === false
    ? 0
    : Number(examen.insumos ?? examen.costo_insumos_directos ?? 0);
  const hasEquipmentReference = Number(examen.equipo_valor_compra) >= 0
    && Number(examen.equipo_vida_util_meses) > 0
    && Number(examen.equipo_minutos_disponibles_mes) > 0
    && Number(examen.equipo_tiempo_uso_minutos) > 0;
  const costoCips = config.equipment?.includeDepreciation === false
    ? 0
    : hasEquipmentReference
      ? ((Number(examen.equipo_valor_compra) / Number(examen.equipo_vida_util_meses)
        + (config.equipment?.includeMaintenance === false ? 0 : Number(examen.equipo_mantenimiento_anual || 0) / 12))
        / Number(examen.equipo_minutos_disponibles_mes)) * Number(examen.equipo_tiempo_uso_minutos)
      : Number(examen.cips ?? examen.costo_depreciacion_equipos ?? 0);

  const costoTotalValido = costoPersonalTotal !== null && costoFijoProrrateado !== null;
  const costoDirectoTotal = costoTotalValido
    ? costoPersonalTotal + costoInsumos + costoCips + costoFijoProrrateado
    : null;

  const tieneTarifaConvenio = examen.tarifa_convenio !== undefined && examen.tarifa_convenio !== null;
  const tarifaConvenio = Number(examen.tarifa_convenio);
  const useContractedTariff = tieneTarifaConvenio
    && (tarifaConvenio !== 0 || config.tariff?.honorZeroContracted !== false);
  const canUseSoat = config.tariff?.useSoatWhenContractMissing !== false
    && Number(examen.tarifa_soat_referencia) > 0;
  const tarifaFaltante = !useContractedTariff && !canUseSoat;
  const tarifa = useContractedTariff
    ? tarifaConvenio
    : canUseSoat ? Number(examen.tarifa_soat_referencia) : 0;

  const utilidad = costoDirectoTotal === null || tarifaFaltante ? null : tarifa - costoDirectoTotal;
  const margenPct = tarifa > 0 && utilidad !== null ? (utilidad / tarifa) * 100 : 0;

  const datosFaltantes = [];
  if (!duracionValida) datosFaltantes.push('duracion_minutos');
  if (allocationMethod === 'per_procedure' ? !Number.isFinite(volumenSede) || volumenSede <= 0 : !Number.isFinite(capacidadMinutosMes) || capacidadMinutosMes <= 0) {
    datosFaltantes.push(allocationMethod === 'per_procedure' ? 'volumen_sede' : 'capacidad_sala_minutos');
  }
  if (costoPersonalTotal === null) datosFaltantes.push('costo_personal');
  if (tarifaFaltante) datosFaltantes.push('tarifa');

  return {
    duracionMinutos,
    costoPersonal: costoPersonalTotal,
    costoInsumos,
    costoCips,
    costoFijoProrrateado,
    costoTotal: costoDirectoTotal,
    costoDirecto: costoDirectoTotal,
    utilidad,
    margenPct,
    datosFaltantes
  };
};

module.exports = {
  calcularCostoMinuto,
  calcularCostoExamen
};