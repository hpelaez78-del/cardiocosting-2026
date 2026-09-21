/**
 * Motor de cálculos financieros para Cardiocosting
 */

const calcularCostoMinuto = (sueldoBase, provPct, horasMes) => {
  const sueldo = Number(sueldoBase) || 0;
  const prov = Number(provPct) || 0;
  const horas = Number(horasMes) || 1;

  if (horas <= 0) return 0;
  const sueldoTotal = sueldo * (1 + prov / 100);
  const costoHora = sueldoTotal / horas;
  return costoHora / 60;
};

const calcularCostoExamen = (examen, rolesMap, sede) => {
  const minMedico = Number(examen.min_medico ?? examen.minutos_medico ?? 0) || 0;
  const minAsistencial = Number(examen.min_asis ?? examen.minutos_asistencial ?? 0) || 0;
  const costoMedico = minMedico * (Number(rolesMap.medico) || 0);
  const costoAsistencial = minAsistencial * (Number(rolesMap.asistencial) || 0);
  const costoPersonalTotal = costoMedico + costoAsistencial;

  const gastosFijosSede =
    Number(sede.arriendo ?? sede.arriendo_mensual ?? 0) +
    Number(sede.servicios ?? sede.servicios_publicos ?? 0) +
    Number(sede.admin ?? sede.nomina_admin ?? 0) +
    Number(sede.mtto ?? sede.mantenimiento_otros ?? 0);

  const volumen = Number(sede.volumen ?? sede.volumen_mensual_esperado ?? 1) || 1;
  const costoFijoPorUnidad = volumen > 0 ? gastosFijosSede / volumen : 0;

  const costoDirectoTotal =
    costoPersonalTotal +
    Number(examen.insumos ?? examen.costo_insumos_directos ?? 0) +
    Number(examen.cips ?? examen.costo_depreciacion_equipos ?? 0) +
    costoFijoPorUnidad;

  const tarifa = Number(examen.tarifa_convenio ?? examen.tarifa_soat_referencia ?? 0) || 0;
  const utilidad = tarifa - costoDirectoTotal;
  const margenPct = tarifa > 0 ? (utilidad / tarifa) * 100 : 0;

  return {
    costoPersonal: costoPersonalTotal,
    costoInsumos: Number(examen.insumos ?? examen.costo_insumos_directos ?? 0),
    costoFijoProrrateado: costoFijoPorUnidad,
    costoTotal: costoDirectoTotal,
    utilidad,
    margenPct
  };
};

module.exports = {
  calcularCostoMinuto,
  calcularCostoExamen
};