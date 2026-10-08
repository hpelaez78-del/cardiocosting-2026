import { useEffect, useState } from 'react';
import { Check, Clock3, Database, History, Save, Settings2 } from 'lucide-react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';

const defaultConfig = {
  labor: { provisionsMode: 'per_role', provisionsPct: 48.5, minutesPerHour: 60 },
  duration: { defaultMode: 'sequential_sum', examModes: {} },
  fixedCost: { allocationMethod: 'practical_capacity', includeRent: true, includeServices: true, includeAdminPayroll: true, includeMaintenance: true },
  supplies: { includeInCost: true },
  equipment: { includeDepreciation: true, includeMaintenance: true },
  tariff: { useSoatWhenContractMissing: true, honorZeroContracted: true }
};

const copyConfig = (config) => ({
  ...defaultConfig,
  ...config,
  labor: { ...defaultConfig.labor, ...config?.labor },
  duration: { ...defaultConfig.duration, ...config?.duration, examModes: { ...config?.duration?.examModes } },
  fixedCost: { ...defaultConfig.fixedCost, ...config?.fixedCost },
  supplies: { ...defaultConfig.supplies, ...config?.supplies },
  equipment: { ...defaultConfig.equipment, ...config?.equipment },
  tariff: { ...defaultConfig.tariff, ...config?.tariff }
});

const CheckField = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);

export default function ConfiguracionCosteo() {
  const { selectedSede, selectedConvenio } = useSedeContext();
  const [config, setConfig] = useState(defaultConfig);
  const [active, setActive] = useState(null);
  const [versions, setVersions] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [selectedExamenId, setSelectedExamenId] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [nombreVersion, setNombreVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activationMissing, setActivationMissing] = useState([]);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [configRes, examenesRes] = await Promise.all([
        api.get('/configuracion-costeo'),
        api.get('/examenes')
      ]);
      const activeConfig = configRes.data.active;
      setActive(activeConfig);
      setConfig(copyConfig(activeConfig.config));
      setVersions(Array.isArray(configRes.data.versions) ? configRes.data.versions : []);
      const examRows = Array.isArray(examenesRes.data) ? examenesRes.data : [];
      setExamenes(examRows);
      setSelectedExamenId((current) => current || examRows[0]?.id || '');
      setNombreVersion(`Versión ${Number(activeConfig.id) + 1}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la configuración de costeo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const updateSection = (section, key, value) => {
    setPreview(null);
    setConfig((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }));
  };

  const updateExamMode = (examId, value) => {
    setPreview(null);
    setConfig((current) => {
      const examModes = { ...current.duration.examModes };
      if (!value) delete examModes[examId];
      else examModes[examId] = value;
      return { ...current, duration: { ...current.duration, examModes } };
    });
  };

  const handlePreview = async () => {
    if (!selectedSede || !selectedExamenId) return;
    setPreviewing(true);
    setError('');
    setPreview(null);
    try {
      const response = await api.post('/configuracion-costeo/preview', {
        sedeId: selectedSede,
        examenId: selectedExamenId,
        convenioId: selectedConvenio,
        config
      });
      setPreview(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo calcular la vista previa.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleActivate = async (versionId) => {
    setError('');
    setMessage('');
    setActivationMissing([]);
    try {
      await api.post(`/configuracion-costeo/${versionId}/activar`);
      setMessage(`Versión ${versionId} restaurada.`);
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restaurar la versión.');
      setActivationMissing(err.response?.data?.faltantes || []);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    setActivationMissing([]);
    try {
      const response = await api.post('/configuracion-costeo', { nombre: nombreVersion, config });
      setMessage(`Versión ${response.data.version.id} guardada y activada.`);
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo activar la nueva versión.');
      setActivationMissing(err.response?.data?.faltantes || []);
    } finally {
      setSaving(false);
    }
  };

  const fixedComponents = [
    ['includeRent', 'Arriendo'],
    ['includeServices', 'Servicios públicos'],
    ['includeAdminPayroll', 'Nómina administrativa por sede'],
    ['includeMaintenance', 'Mantenimiento y otros']
  ];

  if (loading) return <div className="p-6 text-slate-600">Cargando configuración de costeo...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Administración</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Configuración de Costeo</h1>
          <p className="mt-1 text-sm text-slate-500">Versión activa: {active?.id} · {active?.nombre}</p>
        </div>
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input value={nombreVersion} onChange={(event) => setNombreVersion(event.target.value)} aria-label="Nombre de versión" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" required />
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">
            <Save className="h-4 w-4" />{saving ? 'Activando...' : 'Guardar y activar'}
          </button>
        </form>
      </header>

      {error && <p role="alert" className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {activationMissing.length > 0 && <ul role="alert" className="list-inside list-disc rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
        {activationMissing.map((item, index) => <li key={`${item.sedeId}-${item.areaId}-${item.campo}-${index}`}>Sede {item.sedeId}{item.areaId ? `, área ${item.areaId}` : ''}: {item.campo}</li>)}
      </ul>}
      {message && <p role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Settings2 className="h-4 w-4 text-cyan-700" />Personal</h2>
          <label className="block text-sm font-medium text-slate-700">Origen de provisiones
            <select value={config.labor.provisionsMode} onChange={(event) => updateSection('labor', 'provisionsMode', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2">
              <option value="per_role">Por cargo</option>
              <option value="global">Porcentaje global</option>
            </select>
          </label>
          {config.labor.provisionsMode === 'global' && <label className="block text-sm font-medium text-slate-700">Provisiones globales (%)
            <input type="number" min="0" max="100" step="0.1" value={config.labor.provisionsPct} onChange={(event) => updateSection('labor', 'provisionsPct', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" />
          </label>}
          <label className="block text-sm font-medium text-slate-700">Minutos por hora productiva
            <input type="number" min="1" max="120" value={config.labor.minutesPerHour} onChange={(event) => updateSection('labor', 'minutesPerHour', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="space-y-4 rounded border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Clock3 className="h-4 w-4 text-cyan-700" />Duración por defecto</h2>
          <label className="block text-sm font-medium text-slate-700">Modalidad de atención
            <select value={config.duration.defaultMode} onChange={(event) => updateSection('duration', 'defaultMode', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2">
              <option value="sequential_sum">Secuencial: sumar tiempos de personal</option>
              <option value="concurrent_max">Concurrente: usar el mayor tiempo de sala</option>
            </select>
          </label>
          <div className="max-h-64 overflow-auto rounded border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-2">Examen</th><th className="p-2">Regla</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {examenes.map((exam) => (
                  <tr key={exam.id}>
                    <td className="p-2 text-slate-800">{exam.nombre}</td>
                    <td className="p-2"><select value={config.duration.examModes[exam.id] || ''} onChange={(event) => updateExamMode(exam.id, event.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1">
                      <option value="">Usar predeterminada</option>
                      <option value="sequential_sum">Secuencial</option>
                      <option value="concurrent_max">Concurrente</option>
                    </select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 rounded border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Database className="h-4 w-4 text-cyan-700" />Componentes del costo fijo</h2>
          <label className="block text-sm font-medium text-slate-700">Método de distribución
            <select value={config.fixedCost.allocationMethod} onChange={(event) => updateSection('fixedCost', 'allocationMethod', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2">
              <option value="practical_capacity">TDABC por capacidad práctica</option>
              <option value="per_procedure">Costo fijo uniforme por procedimiento</option>
              <option value="area_based">Por áreas y bolsa general</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {fixedComponents.map(([key, label]) => <CheckField key={key} checked={config.fixedCost[key]} label={label} onChange={(value) => updateSection('fixedCost', key, value)} />)}
          </div>
          <CheckField checked={config.supplies.includeInCost} label="Incluir insumos del examen" onChange={(value) => updateSection('supplies', 'includeInCost', value)} />
          <CheckField checked={config.equipment.includeDepreciation} label="Incluir depreciación de equipos" onChange={(value) => updateSection('equipment', 'includeDepreciation', value)} />
          <CheckField checked={config.equipment.includeMaintenance} label="Incluir mantenimiento de equipos" onChange={(value) => updateSection('equipment', 'includeMaintenance', value)} />
        </div>

        <div className="space-y-4 rounded border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Check className="h-4 w-4 text-cyan-700" />Tarifa de referencia</h2>
          <CheckField checked={config.tariff.honorZeroContracted} label="Respetar tarifa convenio en cero" onChange={(value) => updateSection('tariff', 'honorZeroContracted', value)} />
          <CheckField checked={config.tariff.useSoatWhenContractMissing} label="Usar SOAT si el convenio no tiene tarifa" onChange={(value) => updateSection('tariff', 'useSoatWhenContractMissing', value)} />
        </div>
      </section>

      <section className="rounded border border-cyan-200 bg-cyan-50 p-5">
        <h2 className="text-sm font-semibold uppercase text-cyan-900">Vista previa de fórmulas</h2>
        <div className="mt-3 grid gap-3 text-sm text-cyan-950 md:grid-cols-2">
          <p>Minuto laboral: costo mensual con provisiones / (horas productivas × {config.labor.minutesPerHour} min).</p>
          <p>Duración predeterminada: {config.duration.defaultMode === 'sequential_sum' ? 'minutos médico + minutos asistencial' : 'máximo entre minutos médico y asistencial'}.</p>
          <p>Costo fijo: {config.fixedCost.allocationMethod === 'area_based' ? 'minutos por área × tasa de área + duración total × tasa general de la sede.' : config.fixedCost.allocationMethod === 'practical_capacity' ? 'componentes seleccionados / capacidad práctica mensual × minutos de sala.' : 'componentes seleccionados / volumen mensual agregado de la sede.'}</p>
          <p>Equipo: depreciación mensual y mantenimiento configurados, prorrateados por disponibilidad y uso.</p>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-cyan-950">Examen de muestra
            <select value={selectedExamenId} onChange={(event) => { setSelectedExamenId(event.target.value); setPreview(null); }} className="mt-1 block min-w-64 rounded border border-cyan-300 bg-white px-3 py-2">
              {examenes.map((exam) => <option key={exam.id} value={exam.id}>{exam.nombre}</option>)}
            </select>
          </label>
          <button type="button" onClick={handlePreview} disabled={previewing || !selectedSede || !selectedExamenId} className="rounded border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50">
            {previewing ? 'Calculando...' : 'Calcular con borrador'}
          </button>
        </div>
        {preview && (
          <div className="mt-4 grid gap-3 border-t border-cyan-200 pt-4 text-sm text-cyan-950 sm:grid-cols-2 lg:grid-cols-4">
            <p>Costo personal: <strong>{Number(preview.costs.costoPersonal ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Insumos: <strong>{Number(preview.costs.costoInsumos ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Equipos: <strong>{Number(preview.costs.costoCips ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Costo fijo: <strong>{Number(preview.costs.costoFijoProrrateado ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Costo total: <strong>{preview.costs.costoTotal === null ? 'Incompleto' : Number(preview.costs.costoTotal).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Utilidad: <strong>{preview.costs.utilidad === null ? 'N/D' : Number(preview.costs.utilidad).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
            <p>Duración aplicada: <strong>{preview.costs.duracionMinutos} min</strong></p>
            {preview.costs.datosFaltantes.length > 0 && <p className="text-rose-800">Faltan: {preview.costs.datosFaltantes.join(', ')}</p>}
          </div>
        )}
        {config.fixedCost.allocationMethod === 'area_based' && preview?.distribucionAreas && <div className="mt-4 space-y-2 border-t border-cyan-200 pt-4 text-sm text-cyan-950">
          <p>Bolsa fija: <strong>{Number(preview.distribucionAreas.bolsaGeneral + preview.distribucionAreas.bolsaProductiva).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>; productivas: <strong>{Number(preview.distribucionAreas.bolsaProductiva).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>; general: <strong>{Number(preview.distribucionAreas.bolsaGeneral).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>; diferencia: <strong>{Number(preview.distribucionAreas.diferencia).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>.</p>
          {preview.distribucionAreas.bolsaGeneral === 0 && <p role="status" className="text-amber-800">La bolsa general está en cero; revise las áreas comunes.</p>}
          {preview.distribucionAreas.warnings?.length > 0 && <p role="status" className="text-amber-800">Hay exámenes con minutos asignados por áreas superiores a su duración.</p>}
          {preview.distribucionAreas.issues?.length > 0 && <p role="alert" className="text-rose-800">Distribución incompleta: {preview.distribucionAreas.issues.join(', ')}.</p>}
        </div>}
      </section>

      <section className="rounded border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900"><History className="h-4 w-4 text-slate-600" />Historial de versiones</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-2">Versión</th><th className="p-2">Nombre</th><th className="p-2">Creada</th><th className="p-2">Estado</th><th className="p-2">Acción</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {versions.map((version) => <tr key={version.id}>
                <td className="p-2">{version.id}</td>
                <td className="p-2">{version.nombre}</td>
                <td className="p-2">{new Date(version.created_at).toLocaleString('es-CO')}</td>
                <td className="p-2">{version.activa ? <span className="font-semibold text-emerald-700">Activa</span> : 'Histórica'}</td>
                <td className="p-2">{!version.activa && <button type="button" onClick={() => handleActivate(version.id)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">Restaurar</button>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
