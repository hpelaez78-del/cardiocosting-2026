import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function Convenios() {
  const [convenios, setConvenios] = useState([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState('');
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newConvenio, setNewConvenio] = useState({ nombre_eps: '' });
  const [creating, setCreating] = useState(false);

  const fetchConvenios = async () => {
    setLoading(true);
    try {
      const res = await api.get('/convenios');
      const items = Array.isArray(res?.data) ? res.data : [];
      setConvenios(items);
      if (!selectedConvenioId && items[0]?.id) {
        setSelectedConvenioId(String(items[0].id));
      }
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudieron cargar los convenios.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTarifas = async (convenioId) => {
    if (!convenioId) return;
    try {
      const res = await api.get(`/convenios/${convenioId}/tarifas`);
      setTarifas(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudieron cargar las tarifas.');
    }
  };

  useEffect(() => {
    fetchConvenios();
  }, []);

  useEffect(() => {
    if (selectedConvenioId) {
      fetchTarifas(selectedConvenioId);
    }
  }, [selectedConvenioId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/convenios', { nombre_eps: newConvenio.nombre_eps });
      const nuevoId = res?.data?.data?.id ?? res?.data?.id;
      if (nuevoId) {
        setSelectedConvenioId(String(nuevoId));
      }
      setNewConvenio({ nombre_eps: '' });
      await fetchConvenios();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear el convenio.');
    } finally {
      setCreating(false);
    }
  };

  const handleTarifaChange = (index, value) => {
    setTarifas((current) =>
      current.map((item, idx) => (idx === index ? { ...item, tarifa_acordada: value } : item))
    );
  };

  const handleSave = async (tarifa) => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/convenios/${selectedConvenioId}/tarifas`, {
        examen_id: tarifa.examen_id,
        nueva_tarifa: Number(tarifa.tarifa_acordada) || 0,
      });
      await fetchTarifas(selectedConvenioId);
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar la tarifa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-300">Cargando convenios...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-400">Convenios</p>
        <h1 className="text-3xl font-bold text-slate-900">Matriz de Tarifas</h1>
      </div>

      {error && <div className="mb-4 rounded border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}

      <form onSubmit={handleCreate} className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <input value={newConvenio.nombre_eps} onChange={(e) => setNewConvenio({ nombre_eps: e.target.value })} placeholder="Nombre del convenio" className="flex-1 rounded border border-slate-200 bg-slate-50 p-2 text-slate-800" required />
        <button type="submit" disabled={creating} className="rounded bg-amber-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
          {creating ? 'Creando...' : 'Adicionar convenio'}
        </button>
      </form>

      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-300">Convenio</label>
        <select value={selectedConvenioId} onChange={(e) => setSelectedConvenioId(e.target.value)} className="rounded border border-slate-600 bg-slate-800 p-2 text-white">
          {convenios.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre_eps}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="p-3">Examen</th>
              <th className="p-3">Código</th>
              <th className="p-3">Tarifa acordada</th>
              <th className="p-3">Guardar</th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((item, index) => (
              <tr key={item.id ?? `${item.examen_id}-${index}`} className="border-t border-slate-700">
                <td className="p-3 text-white">{item.examen}</td>
                <td className="p-3 text-slate-300">{item.codigo_cups || '-'}</td>
                <td className="p-3"><input value={item.tarifa_acordada ?? 0} onChange={(e) => handleTarifaChange(index, e.target.value)} className="w-40 rounded border border-slate-600 bg-slate-900 p-2 text-white" /></td>
                <td className="p-3">
                  <button disabled={saving} onClick={() => handleSave(item)} className="rounded bg-amber-500 px-3 py-2 font-medium text-slate-950 disabled:opacity-60">
                    {saving ? 'Guardando...' : 'Guardar'}
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

