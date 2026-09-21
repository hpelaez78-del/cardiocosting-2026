import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';
import { 
  Activity,
  Building2, Clock, Microscope, TrendingUp, Scale, 
  Hospital, Mail, Phone, MapPin, Sliders, AlertCircle, LogOut, User, RefreshCw, Save,
  Stethoscope,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedSede } = useSedeContext();
  const [activeTab, setActiveTab] = useState('evaluador');
  const [data, setData] = useState(null);
  const [convenios, setConvenios] = useState([]);
  const [insumosDetalle, setInsumosDetalle] = useState([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState('');
  const [expandedExamenes, setExpandedExamenes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para el Simulador
  const [simIncremento, setSimIncremento] = useState(0);
  const [simVolumen, setSimVolumen] = useState(0);

  let usuarioGuardado = {};
  try {
    usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');
  } catch {
    usuarioGuardado = {};
  }
  const usuarioNombre = usuarioGuardado?.nombre || usuarioGuardado?.email || 'Usuario';

  const cargarDatosBD = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sedesRes, personalRes, conveniosRes, insumosRes] = await Promise.all([
        api.get('/sedes'),
        api.get('/personal'),
        api.get('/convenios'),
        api.get('/insumos')
      ]);

      const sedes = Array.isArray(sedesRes?.data) ? sedesRes.data : [];
      const roles = Array.isArray(personalRes?.data) ? personalRes.data : [];
      const conveniosList = Array.isArray(conveniosRes?.data) ? conveniosRes.data : [];
      const insumos = Array.isArray(insumosRes?.data) ? insumosRes.data : [];
      setConvenios(conveniosList);
      setInsumosDetalle(insumos);

      const generalConvenioId = conveniosList.find((item) => String(item.nombre_eps || '').trim().toLowerCase() === 'general')?.id;
      if (!selectedConvenioId && generalConvenioId) {
        setSelectedConvenioId(String(generalConvenioId));
      }

      const sedeActual = sedes.find((s) => s.id === selectedSede)
        || sedes.find((s) => s.id === 'ibague')
        || sedes[0]
        || null;

      let examenes = [];
      if (sedeActual) {
        const query = selectedConvenioId ? `?convenioId=${encodeURIComponent(selectedConvenioId)}` : '';
        const evaluacionRes = await api.get(`/evaluador/sede/${sedeActual.id}${query}`);
        examenes = Array.isArray(evaluacionRes?.data?.evaluacion)
          ? evaluacionRes.data.evaluacion.map((item) => ({
              ...item,
              tarifaConvenio: Number(item.tarifaConvenio ?? item.tarifa_convenio ?? 0),
              tarifa_convenio: Number(item.tarifaConvenio ?? item.tarifa_convenio ?? 0)
            }))
          : [];
      }

      setData({ sedes, roles, examenes, sedeActual });
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'Error de conexión';
      setError(apiError);
      setData({ sedes: [], roles: [], examenes: [], sedeActual: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosBD();
  }, [selectedSede, selectedConvenioId]);

  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const toggleExamen = (id) => {
    setExpandedExamenes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const guardarCambioBD = async (endpoint, payload) => {
    setSaving(true);
    try {
      let ruta = endpoint || '/sedes';
      if (!ruta.startsWith('/')) ruta = `/${ruta}`;
      if (!ruta.startsWith('/sedes') && !ruta.startsWith('/personal')) {
        ruta = `/sedes/${ruta.replace(/^\//, '')}`;
      }

      await api.put(ruta, payload);
      await cargarDatosBD();
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'Error al guardar en la BD';
      alert(apiError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
          <p className="text-sm font-medium">Cargando módulos desde PostgreSQL...</p>
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
          <p className="mt-2 text-sm text-slate-600">No fue posible cargar la información financiera en este momento.</p>
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
  const sedeActual = data?.sedeActual || sedes.find((s) => s.id === selectedSede) || sedes.find((s) => s.id === 'ibague') || sedes[0] || { arriendo: 0, servicios: 0, admin: 0, mtto: 0, volumen: 1, nombre: 'Sin sede' };

  const med = roles.find((r) => r.id === 'medico' || r.nombre?.toLowerCase().includes('médico') || r.cargo?.toLowerCase().includes('médico')) || { sueldo_base: 0, prov_pct: 0, horas_mes: 1 };
  const asis = roles.find((r) => r.id === 'asistencial' || r.nombre?.toLowerCase().includes('asistencial') || r.cargo?.toLowerCase().includes('asistencial')) || { sueldo_base: 0, prov_pct: 0, horas_mes: 1 };

  const costMinMed = (((Number(med.sueldo_base) || 0) * (1 + (Number(med.prov_pct) || 0) / 100)) / (Number(med.horas_mes) || 1)) / 60;
  const costMinAsis = (((Number(asis.sueldo_base) || 0) * (1 + (Number(asis.prov_pct) || 0) / 100)) / (Number(asis.horas_mes) || 1)) / 60;

  const cfijoUnitActual = ((Number(sedeActual.arriendo) || 0) + (Number(sedeActual.servicios) || 0) + (Number(sedeActual.admin) || 0) + (Number(sedeActual.mtto) || 0)) / (Number(sedeActual.volumen) || 1);

  let totalBalance = 0;
  let countPerdida = 0;
  let countGanancia = 0;

  const evaluadorRows = examenes.map((ex) => {
    const minMed = Number(ex.min_medico) || 0;
    const minAsis = Number(ex.min_asis) || 0;
    const manoObra = (minMed * costMinMed) + (minAsis * costMinAsis);
    const costoTotalReal = manoObra + (Number(ex.insumos) || 0) + (Number(ex.cips) || 0) + cfijoUnitActual;
    const tarifaBase = Number(ex.tarifaConvenio ?? ex.tarifa_convenio ?? 0) || 0;
    const tarifaSimulada = tarifaBase * (1 + simIncremento / 100);
    const margenUnit = tarifaSimulada - costoTotalReal;

    totalBalance += margenUnit * ((Number(ex.vol_mes) || 0) * (1 + simVolumen / 100));
    if (margenUnit < 0) countPerdida++; else countGanancia++;

    return { ...ex, manoObra, costoTotalReal, tarifaSimulada, margenUnit };
  });

  const kpiCards = [
    {
      label: 'Margen proyectado total',
      value: formatCOP(totalBalance),
      tone: 'emerald',
      helper: `${countGanancia} procedimientos ganando`,
    },
    {
      label: 'Volumen total',
      value: `${examenes.reduce((sum, ex) => sum + (Number(ex.vol_mes) || 0), 0).toLocaleString('es-CO')}`,
      tone: 'slate',
      helper: 'pacientes / mes proyectado',
    },
    {
      label: 'Sede actual',
      value: sedeActual?.nombre || 'Sin sede',
      tone: 'cyan',
      helper: `${formatCOP(cfijoUnitActual)} costo fijo unitario`,
    },
    {
      label: 'Estado general',
      value: totalBalance >= 0 ? 'Rentable' : 'No rentable',
      tone: totalBalance >= 0 ? 'emerald' : 'rose',
      helper: `${countPerdida} en pérdida / ${countGanancia} en ganancia`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Convenio activo</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Tarifa aplicada al dashboard</h3>
        </div>
        <select
          value={selectedConvenioId || convenios.find((item) => String(item.nombre_eps || '').trim().toLowerCase() === 'general')?.id || ''}
          onChange={(e) => setSelectedConvenioId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
        >
          {convenios.map((convenio) => (
            <option key={convenio.id} value={String(convenio.id)}>{convenio.nombre_eps}</option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                  item.tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : item.tone === 'rose'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      : item.tone === 'cyan'
                        ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
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

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rendimiento médico</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Matriz de rentabilidad por examen</h3>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ganando
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-3">Examen</th>
                  <th className="px-3 py-3 text-right">MOD</th>
                  <th className="px-3 py-3 text-right">Insumos</th>
                  <th className="px-3 py-3 text-right">Dep.</th>
                  <th className="px-3 py-3 text-right">Fijo</th>
                  <th className="px-3 py-3 text-right">Costo real</th>
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
                      <tr className="hover:bg-slate-50/80">
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
                        <td className="px-3 py-3 text-right text-slate-600">{formatCOP(cfijoUnitActual)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatCOP(row.costoTotalReal)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-cyan-700">{formatCOP(row.tarifaSimulada)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${row.margenUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCOP(row.margenUnit)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              row.margenUnit >= 0
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                            }`}
                          >
                            {row.margenUnit >= 0 ? 'GANANDO' : 'PERDIENDO'}
                          </span>
                        </td>
                      </tr>

                      {detalleInsumos.length > 0 && expandedExamenes[row.id] && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="px-3 py-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Detalle de insumos</p>
                                <span className="text-xs font-medium text-slate-600">Subtotal: {formatCOP(detalleInsumos.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.valor_unitario || 0), 0))}</span>
                              </div>
                              <div className="space-y-1 text-xs text-slate-600">
                                {detalleInsumos.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2 py-1.5">
                                    <span>{item.nombre_insumo}</span>
                                    <span className="font-medium text-slate-700">
                                      {Number(item.cantidad || 0)} × {formatCOP(item.valor_unitario || 0)}
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

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Resumen</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Estructura operativa</h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Costo fijo unitario</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCOP(cfijoUnitActual)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Costo minuto médico</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCOP(costMinMed)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Costo minuto asistencial</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCOP(costMinAsis)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Indicadores</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
                <span>Ganando</span>
                <strong>{countGanancia}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                <span>Perdiendo</span>
                <strong>{countPerdida}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Módulos</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Configuración operativa</h3>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { id: 'evaluador', label: 'Evaluador', icon: Activity, badge: `${countGanancia} en crecimiento` },
            { id: 'personal_tiempo', label: 'Personal', icon: Users, badge: `${roles.length} perfiles` },
            { id: 'sedes_cfijo', label: 'Sedes', icon: Building2, badge: `${sedes.length} sedes activas` },
            { id: 'examenes_insumos', label: 'Exámenes', icon: Stethoscope, badge: `${examenes.length} procedimientos` },
            { id: 'simulador', label: 'Simulador', icon: TrendingUp, badge: 'Qué pasaría si...' },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  activeTab === tab.id
                    ? 'border-cyan-200 bg-cyan-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-cyan-700 ring-1 ring-slate-200">
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