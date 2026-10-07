import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';
import { Save, Plus, Trash2, Calculator, Layers } from 'lucide-react';

const emptySede = { arriendo: 0, servicios: 0, mtto: 0, volumen: 0 };

export default function Sedes() {
  const { selectedSede, sedes } = useSedeContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [datosSede, setDatosSede] = useState(emptySede);
  const [nominaAdmin, setNominaAdmin] = useState(0);
  const [areas, setAreas] = useState([]);

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
            volumen: Number(sede.volumen_mensual_esperado) || 0
          });
        }

        const personal = Array.isArray(personalRes.data) ? personalRes.data : [];
        setNominaAdmin(personal
          .filter((cargo) => cargo.grupo_costeo === 'administrativo')
          .reduce((total, cargo) => total + Number(cargo.cantidad) * Number(cargo.costo_total_persona), 0));

        setAreas((Array.isArray(areasRes.data) ? areasRes.data : []).map((area) => ({
          ...area,
          esDirecto: area.es_directo,
          costoAsignadoDirecto: Number(area.costo_asignado_directo) || 0
        })));
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar la configuración de la sede.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatosSede();
  }, [selectedSede]);

  const costoFijoTotalSede = Number(datosSede.arriendo) + Number(datosSede.servicios)
    + Number(datosSede.mtto) + Number(nominaAdmin);
  const m2Totales = areas.reduce((total, area) => total + (Number(area.m2) || 0), 0);

  const handleGeneralChange = (field, value) => {
    setDatosSede((previous) => ({ ...previous, [field]: Number(value) || 0 }));
  };

  const handleAreaChange = (index, field, value) => {
    setAreas((previous) => previous.map((area, currentIndex) => (
      currentIndex === index ? { ...area, [field]: value } : area
    )));
  };

  const agregarArea = () => {
    setAreas((previous) => [...previous, {
      nombre: '', m2: 0, esDirecto: false, costoAsignadoDirecto: 0
    }]);
  };

  const eliminarArea = (index) => {
    setAreas((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const guardarTodo = async () => {
    if (!selectedSede) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/sedes/${selectedSede}`, datosSede);
      await api.post(`/sedes/${selectedSede}/areas`, { areas });
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
        <button onClick={guardarTodo} disabled={saving || !selectedSede} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition disabled:opacity-50">
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
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" />Distribución de Áreas y Sub-bolsas por Sede</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Total Superficie Registrada: <strong className="text-slate-800">{m2Totales} m²</strong></p>
          </div>
          <button onClick={agregarArea} disabled={!selectedSede} className="flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"><Plus className="w-3.5 h-3.5" />Agregar Área</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="bg-slate-900 text-white uppercase tracking-wider">
              <th className="p-3">Área / Sub-bolsa</th><th className="p-3">Superficie (m²)</th><th className="p-3">% Participación</th><th className="p-3">Criterio Asignación</th><th className="p-3">Valor Sub-bolsa ($)</th><th className="p-3 text-center">Acción</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {areas.map((area, index) => {
                const pct = m2Totales > 0 ? ((Number(area.m2) || 0) / m2Totales) * 100 : 0;
                const costoProrrateado = (pct / 100) * costoFijoTotalSede;
                return <tr key={area.id || index} className="hover:bg-slate-50">
                  <td className="p-3"><input value={area.nombre || ''} onChange={(event) => handleAreaChange(index, 'nombre', event.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" /></td>
                  <td className="p-3"><input type="number" value={area.m2 ?? 0} onChange={(event) => handleAreaChange(index, 'm2', Number(event.target.value))} className="w-24 border border-slate-300 rounded px-2 py-1.5" /></td>
                  <td className="p-3 font-bold text-slate-600">{pct.toFixed(2)}%</td>
                  <td className="p-3"><select value={area.esDirecto ? 'directo' : 'm2'} onChange={(event) => handleAreaChange(index, 'esDirecto', event.target.value === 'directo')} className="border border-slate-300 rounded px-2 py-1.5 bg-white"><option value="directo">Asignación Directa</option><option value="m2">Prorrateo por m²</option></select></td>
                  <td className="p-3 font-extrabold text-blue-700">{area.esDirecto ? <input type="number" value={area.costoAsignadoDirecto ?? 0} onChange={(event) => handleAreaChange(index, 'costoAsignadoDirecto', Number(event.target.value))} className="w-36 border border-slate-300 rounded px-2 py-1.5" /> : `$${costoProrrateado.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                  <td className="p-3 text-center"><button onClick={() => eliminarArea(index)} className="text-slate-400 hover:text-rose-600 p-1" title="Eliminar área"><Trash2 className="w-4 h-4" /></button></td>
                </tr>;
              })}
              {areas.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-slate-500">No hay áreas registradas para esta sede.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}