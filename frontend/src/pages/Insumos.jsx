import { useEffect, useMemo, useState } from 'react';
import { Boxes, Package2, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const emptyForm = {
  examen_id: '',
  nombre_insumo: '',
  cantidad: 1,
  valor_unitario: 0,
};

export default function Insumos() {
  const { selectedSede, sedes } = useSedeContext();
  const [insumos, setInsumos] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cargarExamenes = async () => {
    try {
      const res = await api.get('/examenes');
      const items = Array.isArray(res?.data) ? res.data : [];
      setExamenes(items);
      if (items.length > 0 && !form.examen_id) {
        setForm((prev) => ({ ...prev, examen_id: items[0].id }));
      }
    } catch (err) {
      console.error('No se pudieron cargar los exámenes:', err);
    }
  };

  const cargarInsumos = async () => {
    try {
      if (!selectedSede) {
        setInsumos([]);
        return;
      }
      const res = await api.get('/insumos', { params: { sedeId: selectedSede } });
      const items = Array.isArray(res?.data) ? res.data : [];
      setInsumos(items);
    } catch (err) {
      console.error('No se pudieron cargar los insumos:', err);
      setError(err?.response?.data?.error || 'No se pudieron cargar los insumos.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([cargarExamenes(), cargarInsumos()]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedSede]);

  const resumen = useMemo(() => {
    const total = insumos.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.valor_unitario || 0), 0);
    const grupos = new Map();

    insumos.forEach((item) => {
      const key = String(item.examen_id || 'sin-examen');
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(item);
    });

    return {
      total,
      examenes: grupos.size,
      registros: insumos.length,
    };
  }, [insumos]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      examen_id: examenes[0]?.id || '',
      nombre_insumo: '',
      cantidad: 1,
      valor_unitario: 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        sede_id: selectedSede,
        examen_id: form.examen_id,
        nombre_insumo: form.nombre_insumo,
        cantidad: Number(form.cantidad) || 1,
        valor_unitario: Number(form.valor_unitario) || 0,
      };

      if (editingId) {
        await api.put(`/insumos/${editingId}`, payload);
      } else {
        await api.post('/insumos', payload);
      }

      await cargarInsumos();
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar el insumo.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      examen_id: item.examen_id,
      nombre_insumo: item.nombre_insumo,
      cantidad: item.cantidad,
      valor_unitario: item.valor_unitario,
    });
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.delete(`/insumos/${id}`, { params: { sedeId: selectedSede } });
      await cargarInsumos();
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar el insumo.');
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Cargando insumos...</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Sede: <span className="font-semibold text-slate-800">{sedes.find((sede) => String(sede.id) === String(selectedSede))?.nombre || 'Sin sede seleccionada'}</span></p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registros</span>
            <Package2 className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{resumen.registros}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exámenes</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{resumen.examenes}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Valor total</span>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCOP(resumen.total)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Gestión</p>
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar insumo' : 'Adicionar insumo'}</h3>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-5">
          <select
            value={form.examen_id}
            onChange={(e) => handleChange('examen_id', e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            required
          >
            <option value="">Seleccione examen</option>
            {examenes.map((examen) => (
              <option key={examen.id} value={examen.id}>
                {examen.nombre} ({examen.id})
              </option>
            ))}
          </select>

          <input
            value={form.nombre_insumo}
            onChange={(e) => handleChange('nombre_insumo', e.target.value)}
            placeholder="Nombre del insumo"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            required
          />

          <input
            type="number"
            min="1"
            step="1"
            value={form.cantidad}
            onChange={(e) => handleChange('cantidad', e.target.value)}
            placeholder="Cantidad"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            required
          />

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.valor_unitario}
            onChange={(e) => handleChange('valor_unitario', e.target.value)}
            placeholder="Valor unitario"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            required
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Adicionar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Detalle de insumos</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Examen</th>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Valor unitario</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No hay insumos registrados.
                  </td>
                </tr>
              ) : (
                insumos.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.examen_id}</td>
                    <td className="px-4 py-3">{item.nombre_insumo}</td>
                    <td className="px-4 py-3 text-right">{Number(item.cantidad || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(item.valor_unitario || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCOP(Number(item.cantidad || 0) * Number(item.valor_unitario || 0))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
