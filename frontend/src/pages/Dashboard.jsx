import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';
import { 
  Activity, 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  Stethoscope, 
  Users, 
  Handshake 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { sedes: sedesContexto, selectedSede, selectedConvenio, setSelectedConvenio } = useSedeContext();

  const [activeTab, setActiveTab] = useState('evaluador');
  const [data, setData] = useState(null);
  const [convenios, setConvenios] = useState([]);
  const [insumosDetalle, setInsumosDetalle] = useState([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState(selectedConvenio || '');
  const [expandedExamenes, setExpandedExamenes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para el Simulador
  const [simIncremento, setSimIncremento] = useState(0);
  const [simVolumen, setSimVolumen] = useState(0);

  // Sincronizar selección local con el contexto global
  useEffect(() => {
    if (selectedConvenio && selectedConvenio !== selectedConvenioId) {
      setSelectedConvenioId(selectedConvenio);
    }
  }, [selectedConvenio]);

  const handleConvenioChange = (e) => {
    const newId = e.target.value;
    setSelectedConvenioId(newId);
    if (setSelectedConvenio) {
      setSelectedConvenio(newId);
    }
  };

  const cargarDatosBD = async () => {
    setLoading(true);
    setError(null);
    try {
      const [personalRes, conveniosRes, insumosRes] = await Promise.all([
        api.get('/personal', { params: selectedSede ? { sedeId: selectedSede } : {} }),
        api.get('/convenios'),
        api.get('/insumos', { params: selectedSede ? { sedeId: selectedSede } : {} })
      ]);

      const sedes = Array.isArray(sedesContexto) ? sedesContexto : [];
      const roles = Array.isArray(personalRes?.data) ? personalRes.data : [];
      const conveniosList = Array.isArray(conveniosRes?.data) ? conveniosRes.data : [];
      const insumos = Array.isArray(insumosRes?.data) ? insumosRes.data : [];
      setConvenios(conveniosList);
      setInsumosDetalle(insumos);

      const generalConvenioId = conveniosList.find(
        (item) => String(item.nombre_eps || '').trim().toLowerCase() === 'general'
      )?.id;

      const convenioIdFinal = selectedConvenioId || generalConvenioId || (conveniosList[0]?.id ? String(conveniosList[0].id) : '');
      if (!selectedConvenioId && convenioIdFinal) {
        setSelectedConvenioId(String(convenioIdFinal));
      }

      const sedeActual = sedes.find((s) => String(s.id) === String(selectedSede)) || sedes[0] || null;

      let examenes = [];
      let costoFijoBolsa = null;
      let tasasMinuto = {};
      if (sedeActual) {
        const query = convenioIdFinal ? `?convenioId=${encodeURIComponent(convenioIdFinal)}` : '';
        
        // Petición con fallback para la ruta del evaluador
        let evaluacionRes;
        try {
          evaluacionRes = await api.get(`/evaluador/${sedeActual.id}${query}`);
        } catch {
          evaluacionRes = await api.get(`/evaluador/sede/${sedeActual.id}${query}`);
        }
        costoFijoBolsa = Number(evaluacionRes?.data?.costoFijoBolsa);
        tasasMinuto = evaluacionRes?.data?.tasasMinuto || {};

        const rows = Array.isArray(evaluacionRes?.data?.evaluacion) 
          ? evaluacionRes.data.evaluacion 
          : Array.isArray(evaluacionRes?.data) 
            ? evaluacionRes.data 
            : [];

        examenes = rows.map((item) => ({
          ...item,
          tarifaConvenio: item.tarifaAplicada !== undefined
            ? item.tarifaAplicada
            : item.tarifaConvenio ?? item.tarifa_convenio ?? null,
          tarifa_convenio: item.tarifa_convenio ?? null
        }));
      }

      setData({ sedes, roles, examenes, sedeActual, costoFijoBolsa, tasasMinuto });
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error de conexión con la base de datos';
      const missing = err?.response?.data?.faltantes || [];
      const details = missing.map((item) => `${item.examen || item.examenId}: ${(item.campos || []).join(', ')}`).join('; ');
      const apiError = details ? `${errorMessage} ${details}` : errorMessage;
      setError(apiError);
      setData({ sedes: [], roles: [], examenes: [], sedeActual: null, costoFijoBolsa: null, tasasMinuto: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosBD();
  }, [sedesContexto, selectedSede, selectedConvenioId]);

  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const toggleExamen = (id) => {
    setExpandedExamenes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Cargando indicadores financieros desde PostgreSQL...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Error al conectar con el servidor</h2>
          <p className="mt-2 text-sm text-slate-600">{error || 'No fue posible cargar la información financiera en este momento.'}</p>
          <button
            onClick={cargarDatosBD}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const roles = Array.isArray(data?.roles) ? data.roles : [];
  const sedes = Array.isArray(data?.sedes) ? data.sedes : [];
  const examenes = Array.isArray(data?.examenes) ? data.examenes : [];
  const sedeActual = data?.sedeActual || sedes.find((s) => String(s.id) === String(selectedSede)) || sedes[0] || { arriendo_mensual: 0, servicios_publicos: 0, nomina_admin: 0, mantenimiento_otros: 0, volumen_mensual_esperado: 1, nombre: 'Sin sede' };

  const costMinMed = data.tasasMinuto?.medico === null || data.tasasMinuto?.medico === undefined
    ? null
    : Number(data.tasasMinuto.medico);
  const costMinAsis = data.tasasMinuto?.asistencial === null || data.tasasMinuto?.asistencial === undefined
    ? null
    : Number(data.tasasMinuto.asistencial);

  const volumenSede = Number(sedeActual.volumen_mensual_esperado ?? sedeActual.volumen) || 0;
  const costoFijoMes = Number(data.costoFijoBolsa);
  const cfijoUnitActual = volumenSede > 0 && Number.isFinite(costoFijoMes) ? costoFijoMes / volumenSede : null;

  const tieneVolumenPorExamen = examenes.length > 0 && examenes.every((examen) => examen.volumen !== null && examen.volumen !== undefined);
  const volumenPorExamenEstimado = examenes.some((examen) => examen.volumen_estimado);
  let totalBalance = tieneVolumenPorExamen && examenes.every((examen) => examen.tarifaConvenio !== null && examen.costoTotal !== null) ? 0 : null;
  let countPerdida = 0;
  let countGanancia = 0;

  const evaluadorRows = examenes.map((ex) => {
    const manoObra = Number(ex.costoPersonal) || 0;
    const costoTotalReal = ex.costoTotal === null || ex.costoTotal === undefined ? null : Number(ex.costoTotal);
    const tarifaBase = ex.tarifaConvenio === null || ex.tarifaConvenio === undefined ? null : Number(ex.tarifaConvenio);
    const tarifaSimulada = tarifaBase === null ? null : tarifaBase * (1 + simIncremento / 100);
    const margenUnit = tarifaSimulada === null || costoTotalReal === null ? null : tarifaSimulada - costoTotalReal;

    if (tieneVolumenPorExamen && margenUnit !== null && totalBalance !== null) {
      totalBalance += margenUnit * (Number(ex.volumen) * (1 + simVolumen / 100));
    }
    if (margenUnit !== null) {
      if (margenUnit < 0) countPerdida++; else countGanancia++;
    }

    return { ...ex, manoObra, costoTotalReal, tarifaSimulada, margenUnit };
  });

  const kpiCards = [
    {
      label: 'Margen proyectado total',
      value: totalBalance === null ? 'N/D' : formatCOP(totalBalance),
      tone: totalBalance === null ? 'slate' : 'emerald',
      helper: totalBalance === null ? 'Falta volumen por examen y sede' : volumenPorExamenEstimado ? 'Proyección con volumen estimado' : `${countGanancia} procedimientos en ganancia`,
    },
    {
      label: 'Volumen total',
      value: volumenSede > 0 ? volumenSede.toLocaleString('es-CO') : 'N/D',
      tone: 'slate',
      helper: volumenPorExamenEstimado ? 'volumen prorrateado según mezcla global' : 'volumen mensual agregado de la sede',
    },
    {
      label: 'Sede actual',
      value: sedeActual?.nombre || 'Sin sede',
      tone: 'blue',
      helper: `${cfijoUnitActual === null ? 'N/D' : formatCOP(cfijoUnitActual)} costo fijo promedio por volumen`,
    },
    {
      label: 'Estado general',
      value: totalBalance === null ? 'Pendiente' : totalBalance >= 0 ? 'Rentable' : 'No rentable',
      tone: totalBalance === null ? 'slate' : totalBalance >= 0 ? 'emerald' : 'rose',
      helper: totalBalance === null ? 'Requiere desglose de volumen por examen' : `${countPerdida} en pérdida / ${countGanancia} en ganancia`,
    },
  ];

  const modulesNav = [
    { id: 'evaluador', label: 'Evaluador', icon: Activity, path: '/evaluador', badge: `${countGanancia} en ganancia` },
    { id: 'personal_tiempo', label: 'Personal', icon: Users, path: '/personal', badge: `${roles.length} perfiles` },
    { id: 'sedes_cfijo', label: 'Sedes', icon: Building2, path: '/sedes', badge: `${sedes.length} sedes activas` },
    { id: 'examenes_insumos', label: 'Insumos', icon: Stethoscope, path: '/insumos', badge: `${insumosDetalle.length} insumos` },
    { id: 'simulador', label: 'Simulador', icon: TrendingUp, path: '/simulador', badge: 'Modelado financiero' },
  ];

  return (
    <div className="space-y-6">
      {/* Selector de Convenio y Filtros del Dashboard */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Convenio Activo</p>
            <h3 className="text-base font-bold text-slate-900">Tarifario Aplicado al Consolidado</h3>
          </div>
        </div>

        <select
          value={selectedConvenioId}
          onChange={handleConvenioChange}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {convenios.map((convenio) => (
            <option key={convenio.id} value={String(convenio.id)}>
              {convenio.nombre_eps || `Convenio #${convenio.id}`}
            </option>
          ))}
        </select>
      </div>

      {volumenPorExamenEstimado && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          El volumen por examen de esta sede se prorrateó desde el volumen agregado y la mezcla global; confirme estos datos antes de usar el balance como resultado real.
        </p>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : item.tone === 'rose'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      : item.tone === 'blue'
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                {item.tone === 'emerald' ? 'OK' : item.tone === 'rose' ? 'ALERTA' : 'INFO'}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500">{item.helper}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Tabla Principal y Panel Lateral */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rendimiento Médico</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Matriz de Rentabilidad por Examen</h3>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sede: {sedeActual?.nombre || 'General'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-3">Examen</th>
                  <th className="px-3 py-3 text-right">MOD</th>
                  <th className="px-3 py-3 text-right">Insumos</th>
                  <th className="px-3 py-3 text-right">Equipos</th>
                  <th className="px-3 py-3 text-right">Fijo Unit.</th>
                  <th className="px-3 py-3 text-right">Costo Real</th>
                  <th className="px-3 py-3 text-right">Tarifa</th>
                  <th className="px-3 py-3 text-right">Margen</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluadorRows.map((row) => {
                  const detalleInsumos = insumosDetalle.filter((item) => item.examen_id === row.id);

                  return (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{row.nombre}</span>
                            {detalleInsumos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExamen(row.id)}
                                className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-200"
                              >
                                {expandedExamenes[row.id] ? 'Ocultar' : 'Insumos'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatCOP(row.manoObra)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatCOP(row.insumos)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatCOP(row.cips)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatCOP(row.costoFijoProrrateado ?? cfijoUnitActual)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatCOP(row.costoTotalReal)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-blue-700">{row.tarifaSimulada === null ? 'N/D' : formatCOP(row.tarifaSimulada)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${row.margenUnit === null ? 'text-slate-500' : row.margenUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {row.margenUnit === null ? 'N/D' : formatCOP(row.margenUnit)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              row.margenUnit === null ? 'border-slate-300 bg-slate-100 text-slate-600' : row.margenUnit >= 0
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                            }`}
                          >
                            {row.margenUnit === null ? 'INCOMPLETO' : row.margenUnit >= 0 ? 'GANANDO' : 'PERDIENDO'}
                          </span>
                        </td>
                      </tr>

                      {detalleInsumos.length > 0 && expandedExamenes[row.id] && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="px-3 py-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Detalle de Insumos Directos</p>
                                <span className="text-xs font-bold text-slate-700">Subtotal: {formatCOP(detalleInsumos.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.valor_unitario || 0), 0))}</span>
                              </div>
                              <div className="space-y-1 text-xs text-slate-600">
                                {detalleInsumos.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
                                    <span>{item.nombre_insumo}</span>
                                    <span className="font-medium text-slate-700">
                                      {Number(item.cantidad || 0)} unidades × {formatCOP(item.valor_unitario || 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen Estructural */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Resumen Operativo</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Estructura de Costos Base</h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Fijo Unitario Promedio</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{cfijoUnitActual === null ? 'N/D' : formatCOP(cfijoUnitActual)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Minuto Médico</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{costMinMed === null ? 'N/D' : formatCOP(costMinMed)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Minuto Asistencial</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{costMinAsis === null ? 'N/D' : formatCOP(costMinAsis)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Indicadores de Portafolio</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <span>Procedimientos Rentables</span>
                <span className="text-sm">{countGanancia}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                <span>Procedimientos Deficitarios</span>
                <span className="text-sm">{countPerdida}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accesos Directos a Módulos Configurable */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Módulos del Sistema</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Configuración e Inspección Operativa</h3>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {modulesNav.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.path) navigate(tab.path);
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  activeTab === tab.id
                    ? 'border-blue-300 bg-blue-50/60 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-blue-600 ring-1 ring-slate-200 shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-base font-bold text-slate-900">{tab.label}</p>
                <p className="mt-1 text-xs text-slate-500">{tab.badge}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}