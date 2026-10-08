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

const calcularBolsaFijaSede = (sede, config = {}) => {
  const fixedConfig = config.fixedCost || {};
  const totalComponentes =
    (fixedConfig.includeRent === false ? 0 : Number(sede.arriendo ?? sede.arriendo_mensual ?? 0)) +
    (fixedConfig.includeServices === false ? 0 : Number(sede.servicios ?? sede.servicios_publicos ?? 0)) +
    (fixedConfig.includeAdminPayroll === false ? 0 : Number(sede.admin ?? sede.nomina_admin ?? 0)) +
    (fixedConfig.includeMaintenance === false ? 0 : Number(sede.mtto ?? sede.mantenimiento_otros ?? 0));
  const bolsaAsignada = Number(sede.costoFijoBolsa ?? sede.costo_fijo_bolsa ?? 0);
  return config.fixedCost ? totalComponentes : (bolsaAsignada > 0 ? bolsaAsignada : totalComponentes);
};

const prepararDistribucionAreas = (bolsaFija, areas = []) => {
  const normalizedAreas = areas.map((area) => ({
    ...area,
    id: area.id ?? area.area_id,
    m2: Number(area.m2) || 0,
    capacidadMinutos: Number(area.capacidad_minutos ?? area.capacidadMinutos) || 0,
    costoDirecto: Number(area.costo_asignado_directo ?? area.costoAsignadoDirecto) || 0,
    esDirecto: Boolean(area.es_directo ?? area.esDirecto),
    asignaciones: area.asignaciones || area.examenes || []
  }));
  const directTotal = normalizedAreas
    .filter((area) => area.esDirecto)
    .reduce((total, area) => total + area.costoDirecto, 0);
  const remainder = Number(bolsaFija) - directTotal;
  const m2Areas = normalizedAreas.filter((area) => !area.esDirecto);
  const totalM2 = m2Areas.reduce((total, area) => total + area.m2, 0);
  const issues = [];

  if (remainder < -0.005) issues.push('sub_bolsas_superan_bolsa_fija');
  if (remainder > 0.005 && totalM2 <= 0) issues.push('faltan_areas_para_prorratear_remanente');

  const preparedAreas = normalizedAreas.map((area) => {
    const subBolsa = area.esDirecto
      ? area.costoDirecto
      : totalM2 > 0 ? Math.max(0, remainder) * area.m2 / totalM2 : 0;
    const productiva = area.asignaciones.length > 0;
    return {
      ...area,
      subBolsa,
      productiva,
      tasaMinuto: productiva && area.capacidadMinutos > 0 ? subBolsa / area.capacidadMinutos : null
    };
  });
  const bolsaGeneral = preparedAreas
    .filter((area) => !area.productiva)
    .reduce((total, area) => total + area.subBolsa, 0);
  const bolsaProductiva = preparedAreas
    .filter((area) => area.productiva)
    .reduce((total, area) => total + area.subBolsa, 0);
  const diferencia = Number(bolsaFija) - bolsaGeneral - bolsaProductiva;
  if (Math.abs(diferencia) > 0.005) issues.push('sub_bolsas_no_concilian');

  return {
    areas: preparedAreas,
    bolsaGeneral,
    bolsaProductiva,
    diferencia,
    issues
  };
};

const calcularCostoFijoAreaBased = (examen, sede, duracionMinutos) => {
  const distribution = sede.areaBasedDistribution;
  const missing = [...(distribution?.issues || [])];
  const capacidadSede = Number(sede.capacidad_sala_minutos ?? sede.capacidadSalaMinutos) || 0;
  if (capacidadSede <= 0) missing.push('capacidad_sala_minutos');

  const bolsaGeneral = Number(distribution?.bolsaGeneral) || 0;
  const tasaGeneral = capacidadSede > 0 ? bolsaGeneral / capacidadSede : null;
  let costoAreas = 0;
  const areasExamen = [];
  for (const area of distribution?.areas || []) {
    const asignacion = area.asignaciones.find((item) => String(item.examen_id ?? item.examenId) === String(examen.id));
    if (!asignacion) continue;
    if (area.capacidadMinutos <= 0) {
      missing.push(`capacidad_area_${area.id}`);
      continue;
    }
    const minutos = Number(asignacion.minutos) || 0;
    const costo = minutos * area.tasaMinuto;
    costoAreas += costo;
    areasExamen.push({ areaId: area.id, minutos, tasaMinuto: area.tasaMinuto, costo });
  }

  if (missing.length > 0) return { costo: null, missing: [...new Set(missing)], areasExamen, tasaGeneral };
  return {
    costo: costoAreas + duracionMinutos * tasaGeneral,
    missing: [],
    areasExamen,
    bolsaGeneral,
    tasaGeneral
  };
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

  const gastosFijosSede = calcularBolsaFijaSede(sede, config);

  // --- TDABC: Asignación basada en Capacidad en Minutos ---
  const capacidadMinutosMes = Number(
    examen.capacidad_sala_minutos ?? sede.capacidad_sala_minutos ?? sede.capacidadSalaMinutos ?? sede.minutos_disponibles_mes ?? sede.capacidad_minutos ?? 0
  );

  const allocationMethod = config.fixedCost?.allocationMethod || 'practical_capacity';
  const volumenSede = Number(sede.volumen_mensual_esperado ?? sede.volumen ?? 0);
  const costoMinutoFijoSede = capacidadMinutosMes > 0 ? gastosFijosSede / capacidadMinutosMes : null;
  const areaBasedResult = allocationMethod === 'area_based'
    ? calcularCostoFijoAreaBased(examen, sede, duracionMinutos)
    : null;
  const costoFijoProrrateado = allocationMethod === 'area_based'
    ? areaBasedResult.costo
    : allocationMethod === 'per_procedure'
      ? volumenSede > 0 ? gastosFijosSede / volumenSede : null
      : costoMinutoFijoSede !== null && duracionValida ? duracionMinutos * costoMinutoFijoSede : null;

  const costoInsumos = config.supplies?.includeInCost === false
    ? 0
    : Number(examen.insumos ?? examen.costo_insumos_directos ?? 0);
  const hasEquipmentReference = Number(examen.equipo_valor_compra) >= 0
    && Number(examen.equipo_vida_util_meses) > 0
    && Number(examen.equipo_minutos_disponibles_mes) > 0
    && Number(examen.equipo_tiempo_uso_minutos) > 0;
  const hasRegisteredEquipmentCost = examen.equipo_depreciacion_registrada !== undefined
    && examen.equipo_depreciacion_registrada !== null;
  const costoCips = config.equipment?.includeDepreciation === false
    ? 0
    : hasRegisteredEquipmentCost
      ? Number(examen.equipo_depreciacion_registrada || 0)
        + (config.equipment?.includeMaintenance === false ? 0 : Number(examen.equipo_mantenimiento_registrado || 0))
      : hasEquipmentReference
      ? ((Number(examen.equipo_valor_compra) / Number(examen.equipo_vida_util_meses)
        + (config.equipment?.includeMaintenance === false ? 0 : Number(examen.equipo_mantenimiento_anual || 0) / 12))
        / Number(examen.equipo_minutos_disponibles_mes)) * Number(examen.equipo_tiempo_uso_minutos)
      : Number(examen.cips ?? examen.costo_depreciacion_equipos ?? 0);

  const costoTotalValido = duracionValida && costoPersonalTotal !== null && costoFijoProrrateado !== null;
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
  if (areaBasedResult) datosFaltantes.push(...areaBasedResult.missing);

  return {
    duracionMinutos,
    costoPersonal: costoPersonalTotal,
    costoInsumos,
    costoCips,
    costoFijoProrrateado,
    costoTotal: costoDirectoTotal,
    costoDirecto: costoDirectoTotal,
    tarifaAplicada: tarifaFaltante ? null : tarifa,
    utilidad,
    margenPct,
    datosFaltantes: [...new Set(datosFaltantes)],
    ...(areaBasedResult ? { desgloseCostoFijoAreas: areaBasedResult } : {})
  };
};

module.exports = {
  calcularCostoMinuto,
  calcularCostoExamen,
  prepararDistribucionAreas,
  calcularBolsaFijaSede
};