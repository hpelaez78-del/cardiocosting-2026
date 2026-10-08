import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';
import { Save, Plus, Trash2, Calculator, Layers } from 'lucide-react';

const emptySede = { arriendo: 0, servicios: 0, mtto: 0, volumen: 0, capacidad_sala_minutos: '' };
const defaultFixedCost = { includeRent: true, includeServices: true, includeAdminPayroll: true, includeMaintenance: true };

export default function Sedes() {
  const { selectedSede, sedes } = useSedeContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [datosSede, setDatosSede] = useState(emptySede);
  const [nominaAdmin, setNominaAdmin] = useState(0);
  const [areas, setAreas] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [fixedCostConfig, setFixedCostConfig] = useState(defaultFixedCost);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [assignmentDraft, setAssignmentDraft] = useState({ examenId: '', minutos: '' });

  useEffect(() => {
    const cargarDatosSede = async () => {
      setLoading(true);
      setError('');
      setAreas([]);
      setDatosSede(emptySede);
      setNominaAdmin(0);

      if (!selectedSede) {
        setLoading(false);
        return;
      }

      try {
        const [sedesRes, areasRes, personalRes] = await Promise.all([
          api.get('/sedes'),
          api.get(`/sedes/${selectedSede}/areas`),
          api.get('/personal', { params: { sedeId: selectedSede } })
        ]);
        const sede = (Array.isArray(sedesRes.data) ? sedesRes.data : [])
          .find((item) => String(item.id) === String(selectedSede));

        if (sede) {
          setDatosSede({
            arriendo: Number(sede.arriendo_mensual) || 0,
            servicios: Number(sede.servicios_publicos) || 0,
            mtto: Number(sede.mantenimiento_otros) || 0,
            volumen: Number(sede.volumen_mensual_esperado) || 0,
            capacidad_sala_minutos: sede.capacidad_sala_minutos ?? ''
          });
        }

        const personal = Array.isArray(personalRes.data) ? personalRes.data : [];
        setNominaAdmin(personal
          .filter((cargo) => cargo.grupo_costeo === 'administrativo')
          .reduce((total, cargo) => total + Number(cargo.cantidad) * Number(cargo.costo_total_persona), 0));

        const areaRows = Array.isArray(areasRes.data?.areas) ? areasRes.data.areas : [];
        setFixedCostConfig({ ...defaultFixedCost, ...(areasRes.data?.fixedCost || {}) });
        setAreas(areaRows.map((area) => ({
          ...area,
          esDirecto: area.es_directo,
          costoAsignadoDirecto: Number(area.costo_asignado_directo) || 0,
          capacidadMinutos: area.capacidad_minutos ?? '',
          asignaciones: Array.isArray(area.asignaciones) ? area.asignaciones : [],
          nuevoExamenId: '',
          nuevosMinutos: ''
        })));
        setExamenes(Array.isArray(areasRes.data?.examenes) ? areasRes.data.examenes : []);
        setSelectedAreaIndex(0);
        setAssignmentDraft({ examenId: '', minutos: '' });
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar la configuración de la sede.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatosSede();
  }, [selectedSede]);

  const costoFijoTotalSede =
    (fixedCostConfig.includeRent ? Number(datosSede.arriendo) : 0)
    + (fixedCostConfig.includeServices ? Number(datosSede.servicios) : 0)
    + (fixedCostConfig.includeMaintenance ? Number(datosSede.mtto) : 0)
    + (fixedCostConfig.includeAdminPayroll ? Number(nominaAdmin) : 0);
  const m2Registrados = areas.reduce((total, area) => total + (Number(area.m2) || 0), 0);
  const m2Totales = areas.filter((area) => !area.esDirecto).reduce((total, area) => total + (Number(area.m2) || 0), 0);
  const subBolsaDirecta = areas.filter((area) => area.esDirecto)
    .reduce((total, area) => total + (Number(area.costoAsignadoDirecto) || 0), 0);
  const remanente = Math.max(0, costoFijoTotalSede - subBolsaDirecta);
  const areasCalculadas = areas.map((area) => ({
    ...area,
    subBolsa: area.esDirecto
      ? Number(area.costoAsignadoDirecto) || 0
      : m2Totales > 0 ? remanente * (Number(area.m2) || 0) / m2Totales : 0
  }));
  const bolsaProductiva = areasCalculadas.filter((area) => area.asignaciones.length > 0)
    .reduce((total, area) => total + area.subBolsa, 0);
  const bolsaGeneral = areasCalculadas.filter((area) => area.asignaciones.length === 0)
    .reduce((total, area) => total + area.subBolsa, 0);
  const diferenciaBolsa = costoFijoTotalSede - bolsaProductiva - bolsaGeneral;
  const selectedArea = areas[selectedAreaIndex];
  const assignmentTotals = areas.reduce((map, area) => {
    for (const assignment of area.asignaciones) {
      const key = String(assignment.examen_id);
      const current = map[key] || { minutes: 0, duration: Number(assignment.duracion_examen_minutos) || 0 };
      current.minutes += Number(assignment.minutos || 0);
      map[key] = current;
    }
    return map;
  }, {});
  const minutosExcedidos = Object.entries(assignmentTotals).flatMap(([examId, totals]) => {
    const exam = examenes.find((item) => String(item.id) === String(examId));
    const duration = totals.duration || Number(exam?.minutos_medico || 0) + Number(exam?.minutos_asistencial || 0);
    return duration > 0 && totals.minutes > duration
      ? [{ exam: exam?.nombre || examId, minutes: totals.minutes, duration }]
      : [];
  });

  const handleGeneralChange = (field, value) => {
    setDatosSede((previous) => ({
      ...previous,
      [field]: field === 'capacidad_sala_minutos' && value === '' ? '' : Number(value) || 0
    }));
  };

  const handleAreaChange = (index, field, value) => {
    setAreas((previous) => previous.map((area, currentIndex) => (
      currentIndex === index ? { ...area, [field]: value } : area
    )));
  };

  const agregarArea = () => {
    setAreas((previous) => [...previous, {
      nombre: '', m2: 0, esDirecto: false, costoAsignadoDirecto: 0,
      capacidadMinutos: '', asignaciones: [], nuevoExamenId: '', nuevosMinutos: ''
    }]);
    setSelectedAreaIndex(areas.length);
  };

  const eliminarArea = (index) => {
    setAreas((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    setSelectedAreaIndex((current) => Math.max(0, Math.min(current, areas.length - 2)));
  };

  const agregarAsignacion = () => {
    if (!selectedArea || !assignmentDraft.examenId || Number(assignmentDraft.minutos) <= 0) return;
    setAreas((previous) => previous.map((area, index) => index !== selectedAreaIndex ? area : ({
      ...area,
      asignaciones: [
        ...area.asignaciones.filter((item) => String(item.examen_id) !== String(assignmentDraft.examenId)),
        { examen_id: assignmentDraft.examenId, minutos: Number(assignmentDraft.minutos) }
      ]
    })));
    setAssignmentDraft({ examenId: '', minutos: '' });
  };

  const eliminarAsignacion = (examenId) => {
    setAreas((previous) => previous.map((area, index) => index !== selectedAreaIndex ? area : ({
      ...area,
      asignaciones: area.asignaciones.filter((item) => String(item.examen_id) !== String(examenId))
    })));
  };

  const guardarTodo = async () => {
    if (!selectedSede || subBolsaDirecta > costoFijoTotalSede + 0.005) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/sedes/${selectedSede}`, datosSede);
      await api.post(`/sedes/${selectedSede}/areas`, { areas });
      const savedAreasResponse = await api.get(`/sedes/${selectedSede}/areas`);
      setAreas((Array.isArray(savedAreasResponse.data?.areas) ? savedAreasResponse.data.areas : []).map((area) => ({
        ...area,
        esDirecto: area.es_directo ?? area.esDirecto,
        costoAsignadoDirecto: Number(area.costo_asignado_directo ?? area.costoAsignadoDirecto) || 0,
        capacidadMinutos: area.capacidad_minutos ?? area.capacidadMinutos ?? '',
        asignaciones: Array.isArray(area.asignaciones) ? area.asignaciones : []
      })));
      setError('Configuración guardada correctamente.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-600 font-medium">Cargando configuración de la sede...</div>;

  const sedeActual = sedes.find((item) => String(item.id) === String(selectedSede));

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Sedes y Sub-bolsas (m²)</h1>
          <p className="text-xs text-slate-500 mt-1">Sede activa: <span className="font-bold text-blue-600">{sedeActual?.nombre || 'Sin sede seleccionada'}</span></p>
        </div>
        <button onClick={guardarTodo} disabled={saving || !selectedSede || subBolsaDirecta > costoFijoTotalSede + 0.005} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </header>

      {error && <p role="status" className="text-sm text-slate-700">{error}</p>}
      {!selectedSede && <p className="text-sm text-slate-600">No hay sedes disponibles en la base de datos.</p>}

      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-600" />Estructura de Costos Fijos Generales</h2>
          <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">Total Sede: ${costoFijoTotalSede.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['arriendo', 'Arriendo Mensual ($)'],
            ['servicios', 'Servicios Públicos ($)'],
            ['mtto', 'Mantenimiento y Otros ($)'],
            ['volumen', 'Volumen Mensual Esperado']
          ].map(([field, label]) => (
            <label key={field} className="block text-xs font-bold text-slate-600">
              {label}
              <input type="number" value={datosSede[field]} onChange={(event) => handleGeneralChange(field, event.target.value)} className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </label>
          ))}
          <div className="text-xs font-bold text-slate-600">
            Nómina por cargos asignados
            <output className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800">${nominaAdmin.toLocaleString('es-CO')}</output>
          </div>
          <label className="block text-xs font-bold text-slate-600">Capacidad explícita de la sede (min/mes)
            <input type="number" min="1" value={datosSede.capacidad_sala_minutos} onChange={(event) => handleGeneralChange('capacidad_sala_minutos', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" />Distribución de Áreas y Sub-bolsas por Sede</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Total Superficie Registrada: <strong className="text-slate-800">{m2Registrados} m²</strong></p>
          </div>
          <button onClick={agregarArea} disabled={!selectedSede} className="flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"><Plus className="w-3.5 h-3.5" />Agregar Área</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="bg-slate-900 text-white uppercase tracking-wider">
              <th className="p-3">Área / tipo</th><th className="p-3">Superficie (m²)</th><th className="p-3">% del remanente</th><th className="p-3">Criterio</th><th className="p-3">Sub-bolsa ($)</th><th className="p-3">Capacidad productiva (min)</th><th className="p-3 text-center">Acción</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {areas.map((area, index) => {
                const pct = !area.esDirecto && m2Totales > 0 ? ((Number(area.m2) || 0) / m2Totales) * 100 : 0;
                const areaCalculada = areasCalculadas[index];
                return <tr key={area.id || index} className="hover:bg-slate-50">
                  <td className="p-3"><input value={area.nombre || ''} onChange={(event) => handleAreaChange(index, 'nombre', event.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" /><span className="mt-1 block text-[10px] font-semibold uppercase text-slate-500">{area.asignaciones.length > 0 ? 'Productiva' : 'Común'}</span></td>
                  <td className="p-3"><input type="number" value={area.m2 ?? 0} onChange={(event) => handleAreaChange(index, 'm2', Number(event.target.value))} className="w-24 border border-slate-300 rounded px-2 py-1.5" /></td>
                  <td className="p-3 font-bold text-slate-600">{pct.toFixed(2)}%</td>
                  <td className="p-3"><select value={area.esDirecto ? 'directo' : 'm2'} onChange={(event) => handleAreaChange(index, 'esDirecto', event.target.value === 'directo')} className="border border-slate-300 rounded px-2 py-1.5 bg-white"><option value="directo">Asignación Directa</option><option value="m2">Prorrateo por m²</option></select></td>
                  <td className="p-3 font-extrabold text-blue-700">{area.esDirecto ? <input type="number" min="0" value={area.costoAsignadoDirecto ?? 0} onChange={(event) => handleAreaChange(index, 'costoAsignadoDirecto', Number(event.target.value))} className="w-36 border border-slate-300 rounded px-2 py-1.5" /> : `$${areaCalculada.subBolsa.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                  <td className="p-3">{area.asignaciones.length > 0 ? <input type="number" min="1" value={area.capacidadMinutos ?? ''} onChange={(event) => handleAreaChange(index, 'capacidadMinutos', event.target.value)} className="w-32 border border-slate-300 rounded px-2 py-1.5" /> : <span className="text-slate-400">No aplica</span>}</td>
                  <td className="p-3 text-center"><button onClick={() => eliminarArea(index)} className="text-slate-400 hover:text-rose-600 p-1" title="Eliminar área"><Trash2 className="w-4 h-4" /></button></td>
                </tr>;
              })}
              {areas.length === 0 && <tr><td colSpan="7" className="p-4 text-center text-slate-500">No hay áreas registradas para esta sede.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Exámenes por área</h2>
            <p className="mt-1 text-xs text-slate-500">Las áreas sin exámenes se consideran comunes y forman la bolsa general.</p>
          </div>
          <label className="text-xs font-semibold text-slate-600">Área
            <select value={selectedAreaIndex} onChange={(event) => setSelectedAreaIndex(Number(event.target.value))} className="ml-2 rounded border border-slate-300 bg-white px-2 py-1.5">
              {areas.map((area, index) => <option key={area.id || index} value={index}>{area.nombre || `Área ${index + 1}`}</option>)}
            </select>
          </label>
        </div>
        {selectedArea ? <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 text-xs font-semibold text-slate-600">Examen
              <select value={assignmentDraft.examenId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, examenId: event.target.value }))} className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-2">
                <option value="">Seleccione un examen</option>
                {examenes.map((exam) => <option key={exam.id} value={exam.id}>{exam.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Minutos en esta área
              <input type="number" min="0.01" step="0.01" value={assignmentDraft.minutos} onChange={(event) => setAssignmentDraft((current) => ({ ...current, minutos: event.target.value }))} className="mt-1 block w-40 rounded border border-slate-300 px-2 py-2" />
            </label>
            <button type="button" onClick={agregarAsignacion} disabled={!assignmentDraft.examenId || Number(assignmentDraft.minutos) <= 0} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Asignar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="p-2">Examen</th><th className="p-2">Minutos aquí</th><th className="p-2">Acción</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {selectedArea.asignaciones.map((assignment) => <tr key={assignment.examen_id}>
                  <td className="p-2 text-slate-800">{examenes.find((exam) => String(exam.id) === String(assignment.examen_id))?.nombre || assignment.examen_nombre || assignment.examen_id}</td>
                  <td className="p-2"><input type="number" min="0.01" step="0.01" value={assignment.minutos} onChange={(event) => handleAreaChange(selectedAreaIndex, 'asignaciones', selectedArea.asignaciones.map((item) => String(item.examen_id) === String(assignment.examen_id) ? { ...item, minutos: Number(event.target.value) } : item))} className="w-28 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="p-2"><button type="button" onClick={() => eliminarAsignacion(assignment.examen_id)} className="font-semibold text-rose-700">Quitar</button></td>
                </tr>)}
                {selectedArea.asignaciones.length === 0 && <tr><td colSpan="3" className="p-3 text-center text-slate-500">Sin exámenes asignados; esta área es común.</td></tr>}
              </tbody>
            </table>
          </div>
        </> : <p className="text-sm text-slate-500">Agregue un área para registrar exámenes.</p>}
        {minutosExcedidos.length > 0 && <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Los minutos asignados superan la duración de: {minutosExcedidos.map((item) => `${item.exam} (${item.minutes}/${item.duration} min)`).join(', ')}.</p>}
        <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
          <p>Bolsa fija: <strong>${costoFijoTotalSede.toLocaleString('es-CO')}</strong></p>
          <p>Sub-bolsas productivas: <strong>${bolsaProductiva.toLocaleString('es-CO')}</strong></p>
          <p>Bolsa general (áreas comunes): <strong>${bolsaGeneral.toLocaleString('es-CO')}</strong></p>
          <p className={Math.abs(diferenciaBolsa) > 0.005 ? 'font-semibold text-amber-800' : 'text-emerald-800'}>Diferencia de conciliación: <strong>${diferenciaBolsa.toLocaleString('es-CO')}</strong></p>
          {subBolsaDirecta > costoFijoTotalSede + 0.005 && <p role="alert" className="font-semibold text-rose-800 sm:col-span-2">Las asignaciones directas superan la bolsa fija; no se puede guardar.</p>}
          {bolsaGeneral < 0.005 && <p role="status" className="text-amber-800 sm:col-span-2">La bolsa general queda en cero; verifique que registró las áreas comunes.</p>}
        </div>
      </section>
    </div>
  );
}