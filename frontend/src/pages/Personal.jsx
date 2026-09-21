import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function Personal() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [newRol, setNewRol] = useState({
    id: '',
    cargo: '',
    sueldo_base: 0,
    prov_pct: 0,
    horas_mes: 160,
  });
  const [creating, setCreating] = useState(false);

  const fetchPersonal = async () => {
    setLoading(true);
    try {
      const res = await api.get('/personal');
      setPersonal(Array.isArray(res?.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo cargar el personal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/personal', {
        id: newRol.id,
        cargo: newRol.cargo,
        sueldo_base: Number(newRol.sueldo_base) || 0,
        prov_pct: Number(newRol.prov_pct) || 0,
        horas_mes: Number(newRol.horas_mes) || 1,
      });
      setNewRol({ id: '', cargo: '', sueldo_base: 0, prov_pct: 0, horas_mes: 160 });
      await fetchPersonal();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear el rol.');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (rol) => {
    setSavingId(rol.id);
    setError('');
    try {
      await api.put(`/personal/${rol.id}`, {
        sueldo_base: Number(rol.sueldo_base) || 0,
        prov_pct: Number(rol.prov_pct) || 0,
        horas_mes: Number(rol.horas_mes) || 1,
      });
      await fetchPersonal();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar el rol.');
    } finally {
      setSavingId(null);
    }
  };

  const updateField = (id, field, value) => {
    setPersonal((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  if (loading) return <div className="p-8 text-slate-300">Cargando personal...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Nomina</p>
        <h1 className="text-3xl font-bold text-slate-900">Personal y Costos por Rol</h1>
      </div>

      {error && <div className="mb-4 rounded border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}

      <form onSubmit={handleCreate} className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input value={newRol.id} onChange={(e) => setNewRol({ ...newRol, id: e.target.value })} placeholder="ID" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" required />
        <input value={newRol.cargo} onChange={(e) => setNewRol({ ...newRol, cargo: e.target.value })} placeholder="Cargo / rol" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800 md:col-span-2" required />
        <input type="number" value={newRol.sueldo_base} onChange={(e) => setNewRol({ ...newRol, sueldo_base: e.target.value })} placeholder="Sueldo base" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" />
        <input type="number" value={newRol.prov_pct} onChange={(e) => setNewRol({ ...newRol, prov_pct: e.target.value })} placeholder="% provisiones" className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" />
        <button type="submit" disabled={creating} className="rounded bg-sky-600 px-3 py-2 font-medium text-white disabled:opacity-60">
          {creating ? 'Creando...' : 'Adicionar rol'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="p-3">Rol</th>
              <th className="p-3">Sueldo base</th>
              <th className="p-3">% provisiones</th>
              <th className="p-3">Horas/mes</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {personal.map((rol) => (
              <tr key={rol.id} className="border-t border-slate-700">
                <td className="p-3 font-semibold text-white">{rol.cargo || rol.nombre}</td>
                <td className="p-3"><input value={rol.sueldo_base ?? 0} onChange={(e) => updateField(rol.id, 'sueldo_base', e.target.value)} className="w-36 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={rol.prov_pct ?? 0} onChange={(e) => updateField(rol.id, 'prov_pct', e.target.value)} className="w-24 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3"><input value={rol.horas_mes ?? 1} onChange={(e) => updateField(rol.id, 'horas_mes', e.target.value)} className="w-24 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3">
                  <button onClick={() => handleSave(rol)} disabled={savingId === rol.id} className="rounded bg-sky-600 px-3 py-2 font-medium text-white disabled:opacity-50">
                    {savingId === rol.id ? 'Guardando...' : 'Guardar'}
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

