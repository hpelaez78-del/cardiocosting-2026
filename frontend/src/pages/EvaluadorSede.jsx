import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';
import { Activity, Clock, PieChart, Sliders } from 'lucide-react';

export default function EvaluadorSede() {
  const { sedes, selectedSede, setSelectedSede, selectedConvenio } = useSedeContext();

  const [evaluacionData, setEvaluacionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados del Motor de Drivers Interactivo
  const [criterio, setCriterio] = useState('tiempo'); // 'volumen' | 'tiempo' | 'ocupacion'
  const [costoFijoBolsa, setCostoFijoBolsa] = useState(0);

  // Cargar evaluación desde el backend al cambiar de sede o convenio
  useEffect(() => {
    if (!selectedSede) return;
    setLoading(true);
    setError('');

    const params = selectedConvenio ? { convenioId: selectedConvenio } : {};

    api.get(`/evaluador/${selectedSede}`, { params })
      .then((res) => {
        const data = res?.data || {};
        setEvaluacionData(data);
        if (data.costoFijoBolsa !== undefined && data.costoFijoBolsa !== null) {
          setCostoFijoBolsa(Number(data.costoFijoBolsa));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'No se pudo calcular el costeo.');
        setEvaluacionData({ evaluacion: [] });
        setLoading(false);
      });
  }, [selectedSede, selectedConvenio]);

  const listaExamenes = evaluacionData?.evaluacion || [];
  const tieneVolumenSede = listaExamenes.length > 0
    && listaExamenes.every((item) => item.volumen !== null && item.volumen !== undefined);
  const volumenPorExamenEstimado = listaExamenes.some((item) => item.volumen_estimado);

  // Cálculos globales para inductores dinámicos
  const volumenTotal = listaExamenes.reduce(
    (acc, item) => acc + (Number(item.volumen ?? item.vol_mes) || 0), 0
  );
  
  const minutosTotalesGlobal = listaExamenes.reduce(
    (acc, item) => {
      const vol = Number(item.volumen ?? item.vol_mes) || 0;
      const min = Number(item.duracion_minutos ?? item.tiempoMinutos) || 0;
      return acc + (vol * min);
    },
    0
  );

  // Motor dinámico de absorción
  const calcularAbsorcion = (item) => {
    if (item.volumen === null || item.volumen === undefined) {
      return { factorPct: null, costoTotalProc: null, costoUnitarioProc: Number(item.costoFijoProrrateado) || 0 };
    }
    const vol = Number(item.volumen ?? item.vol_mes) || 0;
    const tMin = Number(item.duracion_minutos ?? item.tiempoMinutos) || 0;
    const minP = vol * tMin;

    if (vol === 0) return { factorPct: 0, costoTotalProc: 0, costoUnitarioProc: 0 };

    let factor = 0;
    if (criterio === 'volumen') {
      factor = volumenTotal > 0 ? vol / volumenTotal : 0;
    } else if (criterio === 'tiempo') {
      factor = minutosTotalesGlobal > 0 ? minP / minutosTotalesGlobal : 0;
    } else if (criterio === 'ocupacion') {
      const capacidadSalaMinutos = Number(item.capacidad_sala_minutos) || 0;
      factor = capacidadSalaMinutos > 0 ? minP / capacidadSalaMinutos : 0;
    }

    const costoTotalProc = costoFijoBolsa * factor;
    const costoUnitarioProc = costoTotalProc / vol;

    return { factorPct: factor * 100, costoTotalProc, costoUnitarioProc };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Evaluador Dynamic Driver de Costos Fijos</h1>
          <p className="text-xs text-gray-500 mt-1">Análisis de absorción TDABC e impacto unitario por procedimiento</p>
        </div>
        {sedes.length > 0 && (
          <select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg bg-white shadow-sm font-semibold text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {sedes.map((s) => (
              <option key={s.id || s.slug} value={s.id || s.slug}>
                {s.nombre || `Sede #${s.id}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {/* Panel de Controles del Motor */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Inductor de Costo (Driver)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setCriterio('volumen')}
              disabled={!tieneVolumenSede}
              className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                criterio === 'volumen'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Volumen
            </button>
            <button
              onClick={() => setCriterio('tiempo')}
              disabled={!tieneVolumenSede}
              className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                criterio === 'tiempo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              Tiempo
            </button>
            <button
              onClick={() => setCriterio('ocupacion')}
              disabled={!tieneVolumenSede || listaExamenes.some((item) => Number(item.capacidad_sala_minutos) <= 0)}
              className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                criterio === 'ocupacion'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Ocupación
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Bolsa de Costo Fijo ($)
          </label>
          <output className="block w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-bold text-gray-800">
            ${costoFijoBolsa.toLocaleString('es-CO')}
          </output>
        </div>

      </div>

      {listaExamenes.length > 0 && !tieneVolumenSede && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Falta cargar el volumen de cada examen para esta sede. Se muestran costos unitarios, pero no la absorción ni el balance total.
        </p>
      )}
      {volumenPorExamenEstimado && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          El volumen por examen se prorrateó desde la mezcla global; confirme la distribución antes de usar la absorción como resultado real.
        </p>
      )}

      {/* Tabla Dinámica de Resultados */}
      {loading ? (
        <p className="text-gray-500 font-medium p-4">Calculando estructura de costos dinámicos...</p>
      ) : listaExamenes.length ? (
        <div className="bg-white shadow border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Resultados de Absorción y Márgenes por Examen
            </h2>
            <span className="text-xs font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 uppercase">
              Driver Activo: {criterio}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900 text-white uppercase tracking-wider">
                  <th className="p-3">Examen</th>
                  <th className="p-3">Volumen</th>
                  <th className="p-3">Tiempo (min)</th>
                  <th className="p-3">% Absorción</th>
                  <th className="p-3">Costo Fijo Unit. ($)</th>
                  <th className="p-3">Tarifa Convenio</th>
                  <th className="p-3">Costo Total Unit.</th>
                  <th className="p-3">Utilidad Unit.</th>
                  <th className="p-3">Margen %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {listaExamenes.map((item) => {
                  const { factorPct, costoUnitarioProc } = calcularAbsorcion(item);
                  
                  // Costo directo básico (Personal + Insumos + CIPs)
                  const costoDirectoBase = Number(item.costoPersonal || 0) + Number(item.costoInsumos || 0) + Number(item.costoCips || 0);
                  const costoDirecto = costoDirectoBase > 0 ? costoDirectoBase : Number(item.costoTotal || item.costoDirecto || 0);
                  
                  const costoTotalExamen = costoDirecto + costoUnitarioProc;
                  const tarifa = Number(item.tarifaConvenio || 0);
                  const utilidadFinal = tarifa - costoTotalExamen;
                  const margenPctFinal = tarifa > 0 ? (utilidadFinal / tarifa) * 100 : 0;

                  const volDisplay = item.volumen === null || item.volumen === undefined ? 'N/D' : Number(item.volumen).toLocaleString('es-CO');
                  const minDisplay = Number(item.duracion_minutos ?? item.tiempoMinutos) || 0;

                  return (
                    <tr key={item.examenId || item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-semibold text-gray-800">{item.nombre}</td>
                      <td className="p-3 text-gray-700">{volDisplay} proc</td>
                      <td className="p-3 text-gray-700">{minDisplay} min</td>
                      <td className="p-3 font-bold text-blue-600">{factorPct === null ? 'N/D' : `${factorPct.toFixed(2)}%`}</td>
                      <td className="p-3 font-bold text-purple-700">
                        ${costoUnitarioProc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 font-semibold text-blue-700">${tarifa.toLocaleString()}</td>
                      <td className="p-3 text-slate-800 font-semibold">
                        ${costoTotalExamen.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`p-3 font-bold ${utilidadFinal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${utilidadFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[11px] font-bold ${margenPctFinal >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {margenPctFinal.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 p-4">Seleccione una sede válida para ver el análisis de costos.</p>
      )}
    </div>
  );
}