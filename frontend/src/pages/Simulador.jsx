import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';

export default function Simulador() {
  const { sedes, selectedSede, setSelectedSede } = useSedeContext();
  const [convenios, setConvenios] = useState([]);
  const [insumosDetalle, setInsumosDetalle] = useState([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState('');
  const [expandedExamenes, setExpandedExamenes] = useState({});
  const [evaluacion, setEvaluacion] = useState([]);
  const [incremento, setIncremento] = useState(0);
  const [volumen, setVolumen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarConvenios = async () => {
      try {
        const res = await api.get('/convenios');
        const items = Array.isArray(res?.data) ? res.data : [];
        setConvenios(items);

        const generalConvenioId = items.find((item) => String(item.nombre_eps || '').trim().toLowerCase() === 'general')?.id;
        if (!selectedConvenioId && generalConvenioId) {
          setSelectedConvenioId(String(generalConvenioId));
        }
      } catch (err) {
        console.error('No se pudieron cargar los convenios:', err);
      }
    };

    cargarConvenios();
  }, []);

  useEffect(() => {
    const cargarInsumos = async () => {
      if (!selectedSede) {
        setInsumosDetalle([]);
        return;
      }
      try {
        const res = await api.get('/insumos', { params: { sedeId: selectedSede } });
        setInsumosDetalle(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error('No se pudieron cargar los insumos:', err);
      }
    };

    cargarInsumos();
  }, [selectedSede]);

  const fetchData = async () => {
    try {
      if (!selectedSede) return;
      const query = selectedConvenioId ? `?convenioId=${encodeURIComponent(selectedConvenioId)}` : '';
      const evaluacionRes = await api.get(`/evaluador/sede/${selectedSede}${query}`);
      const rows = Array.isArray(evaluacionRes?.data?.evaluacion)
        ? evaluacionRes.data.evaluacion.map((item) => ({
            ...item,
            tarifaConvenio: item.tarifaAplicada ?? item.tarifa_aplicada ?? item.tarifa_soat_referencia ?? null,
            tarifa_convenio: item.tarifa_convenio ?? null
          }))
        : [];
      setEvaluacion(rows);
      setError('');
    } catch (err) {
      const errorMessage = err?.response?.data?.error || 'No se pudo cargar el simulador.';
      const missing = err?.response?.data?.faltantes || [];
      const details = missing.map((item) => `${item.examen || item.examenId}: ${(item.campos || []).join(', ')}`).join('; ');
      setError(details ? `${errorMessage} ${details}` : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSede && sedes.length > 0) {
      setSelectedSede(sedes[0].id);
      return;
    }
    if (selectedSede) {
      fetchData();
    }
  }, [selectedSede, sedes, selectedConvenioId]);

  const filas = useMemo(() =>
    evaluacion.map((item) => {
      const tarifaSimulada = Number(item.tarifaConvenio || 0) * (1 + incremento / 100);
      const margen = tarifaSimulada - Number(item.costoTotal || 0);
      const volumenAfectado = item.vol_mes === null || item.vol_mes === undefined
        ? null
        : Number(item.vol_mes) * (1 + volumen / 100);
      const balance = volumenAfectado === null ? null : margen * volumenAfectado;
      return { ...item, tarifaSimulada, margen, volumenAfectado, balance };
    }),
    [evaluacion, incremento, volumen]
  );

  const tieneVolumenSede = evaluacion.length > 0 && evaluacion.every((item) => item.vol_mes !== null && item.vol_mes !== undefined);
  const totalBalance = tieneVolumenSede ? filas.reduce((sum, item) => sum + Number(item.balance || 0), 0) : null;

  const toggleExamen = (id) => {
    setExpandedExamenes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) return <div className="p-8 text-slate-300">Cargando simulador...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-rose-400">Simulación</p>
          <h1 className="text-3xl font-bold text-slate-900">Proyección de Escenarios</h1>
        </div>
        <div className="rounded-xl border border-lime-700 bg-lime-950/30 px-4 py-3 text-right text-lime-200">
          <div className="text-xs uppercase tracking-[0.2em] text-lime-300">Balance proyectado</div>
          <div className="text-2xl font-bold">{totalBalance === null ? 'N/D' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalBalance)}</div>
        </div>
      </div>

      {error && <div className="mb-4 rounded border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
      {!error && evaluacion.length > 0 && !tieneVolumenSede && <div role="status" className="mb-4 rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">Falta cargar el volumen por examen para esta sede. Se muestran costos y márgenes unitarios; el balance total no está disponible.</div>}
      {!error && evaluacion.some((item) => item.volumen_estimado) && <div role="status" className="mb-4 rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">El volumen por examen se prorrateó desde la mezcla global. Confirme la distribución antes de usar el balance como resultado real.</div>}

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm text-slate-300">Sede</label>
          <select value={selectedSede} onChange={(e) => setSelectedSede(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white">
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>{sede.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Convenio</label>
          <select
            value={selectedConvenioId || convenios.find((item) => String(item.nombre_eps || '').trim().toLowerCase() === 'general')?.id || ''}
            onChange={(e) => setSelectedConvenioId(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white"
          >
            {convenios.length === 0 ? <option value="">Cargando...</option> : null}
            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>{convenio.nombre_eps}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Incremento %</label>
          <input type="number" value={incremento} onChange={(e) => setIncremento(Number(e.target.value) || 0)} className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white" />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Volumen %</label>
          <input type="number" value={volumen} onChange={(e) => setVolumen(Number(e.target.value) || 0)} disabled={!tieneVolumenSede} className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white disabled:opacity-50" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="p-3">Examen</th>
              <th className="p-3">Tarifa base</th>
              <th className="p-3">Tarifa simulada</th>
              <th className="p-3">Costo real</th>
              <th className="p-3">Margen</th>
              <th className="p-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((item) => {
              const detalleInsumos = insumosDetalle.filter((insumo) => insumo.examen_id === item.examenId);
              const subtotalInsumos = detalleInsumos.reduce((sum, insumo) => sum + Number(insumo.cantidad || 0) * Number(insumo.valor_unitario || 0), 0);

              return (
                <>
                  <tr key={item.examenId} className="border-t border-slate-700">
                    <td className="p-3 text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.nombre}</span>
                        {detalleInsumos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExamen(item.examenId)}
                            className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-slate-500 hover:bg-slate-600"
                          >
                            {expandedExamenes[item.examenId] ? 'Ocultar' : 'Insumos'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.tarifaConvenio || 0))}</td>
                    <td className="p-3 text-sky-300">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.tarifaSimulada || 0))}</td>
                    <td className="p-3 text-rose-300">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.costoTotal || 0))}</td>
                    <td className={`p-3 font-semibold ${Number(item.margen || 0) >= 0 ? 'text-lime-400' : 'text-rose-400'}`}>
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.margen || 0))}
                    </td>
                    <td className="p-3 font-semibold text-white">{item.balance === null ? 'N/D' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.balance || 0))}</td>
                  </tr>

                  {detalleInsumos.length > 0 && expandedExamenes[item.examenId] && (
                    <tr key={`${item.examenId}-insumos`} className="border-b border-slate-700 bg-slate-900/50">
                      <td colSpan={6} className="p-3">
                        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Detalle de insumos</span>
                            <span className="text-xs text-slate-300">Subtotal: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subtotalInsumos)}</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-200">
                            {detalleInsumos.map((insumo) => (
                              <div key={insumo.id} className="flex items-center justify-between gap-3 rounded bg-slate-800 px-2 py-1">
                                <span>{insumo.nombre_insumo}</span>
                                <span className="text-slate-300">{Number(insumo.cantidad || 0)} × {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(insumo.valor_unitario || 0))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
