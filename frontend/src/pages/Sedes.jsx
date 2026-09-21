import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function Sedes() {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [newSede, setNewSede] = useState({
    id: '',
    nombre: '',
    arriendo: 0,
    servicios: 0,
    admin: 0,
    mtto: 0,
    volumen: 1,
  });
  const [creating, setCreating] = useState(false);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sedes');
      setSedes(Array.isArray(res?.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudieron cargar las sedes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/sedes', {
        id: newSede.id,
        nombre: newSede.nombre,
        arriendo: Number(newSede.arriendo) || 0,
        servicios: Number(newSede.servicios) || 0,
        admin: Number(newSede.admin) || 0,
        mtto: Number(newSede.mtto) || 0,
        volumen: Number(newSede.volumen) || 1,
      });
      setNewSede({ id: '', nombre: '', arriendo: 0, servicios: 0, admin: 0, mtto: 0, volumen: 1 });
      await fetchSedes();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear la sede.');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (sede) => {
    setSavingId(sede.id);
    setError('');
    try {
      await api.put(`/sedes/${sede.id}`, {
        arriendo: Number(sede.arriendo) || 0,
        servicios: Number(sede.servicios) || 0,
        admin: Number(sede.admin) || 0,
        mtto: Number(sede.mtto) || 0,
        volumen: Number(sede.volumen) || 1,
      });
      await fetchSedes();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar la sede.');
    } finally {
      setSavingId(null);
    }
  };

  const updateField = (id, field, value) => {
    setSedes((current) =>
      current.map((sede) => (sede.id === id ? { ...sede, [field]: value } : sede))
    );
  };

  if (loading) return <div className="p-8 text-slate-300">Cargando sedes...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-lime-400">Configuración</p>
          <h1 className="text-3xl font-bold text-slate-900">Sedes y Costos Fijos</h1>
        </div>
      </div>

      {error && <div className="mb-4 rounded border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}

      <form onSubmit={handleCreate} className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-7">
        <input value={newSede.id} onChange={(e) => setNewSede({ ...newSede, id: e.target.value })} placeholder="ID" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" required />
        <input value={newSede.nombre} onChange={(e) => setNewSede({ ...newSede, nombre: e.target.value })} placeholder="Nombre sede" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800 md:col-span-2" required />
        <input type="number" value={newSede.arriendo} onChange={(e) => setNewSede({ ...newSede, arriendo: e.target.value })} placeholder="Arriendo" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" />
        <input type="number" value={newSede.servicios} onChange={(e) => setNewSede({ ...newSede, servicios: e.target.value })} placeholder="Servicios" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" />
        <input type="number" value={newSede.admin} onChange={(e) => setNewSede({ ...newSede, admin: e.target.value })} placeholder="Admin" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" />
        <button type="submit" disabled={creating} className="rounded bg-lime-600 px-3 py-2 font-medium text-white disabled:opacity-60">
          {creating ? 'Creando...' : 'Adicionar sede'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="p-3">Sede</th>
              <th className="p-3">Arriendo</th>
              <th className="p-3">Servicios</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Mantenimiento</th>
              <th className="p-3">Volumen</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sedes.map((sede) => (
              <tr key={sede.id} className="border-t border-slate-700">
                <td className="p-3 font-semibold text-white">{sede.nombre}</td>
                <td className="p-3"><input value={sede.arriendo ?? 0} onChange={(e) => updateField(sede.id, 'arriendo', e.target.value)} className="w-32 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={sede.servicios ?? 0} onChange={(e) => updateField(sede.id, 'servicios', e.target.value)} className="w-32 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={sede.admin ?? 0} onChange={(e) => updateField(sede.id, 'admin', e.target.value)} className="w-32 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={sede.mtto ?? 0} onChange={(e) => updateField(sede.id, 'mtto', e.target.value)} className="w-32 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={sede.volumen ?? 1} onChange={(e) => updateField(sede.id, 'volumen', e.target.value)} className="w-24 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3">
                  <button onClick={() => handleSave(sede)} disabled={savingId === sede.id} className="rounded bg-lime-600 px-3 py-2 font-medium text-white disabled:opacity-50">
                    {savingId === sede.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

