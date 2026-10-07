import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';

export default function Equipos() {
  const { selectedSede } = useSedeContext();

  const [equipos, setEquipos] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    valor_compra: '',
    vida_util_meses: '',
    costo_mantenimiento_anual: '',
    minutos_disponibles_mes: '',
    examen_id: '',
    tiempo_uso_minutos: ''
  });

  useEffect(() => {
    cargarDatos();
  }, [selectedSede]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resEquipos, resExamenes] = await Promise.all([
        api.get(`/equipos/${selectedSede}`),
        api.get('/examenes')
      ]);

      const listaEquipos = Array.isArray(resEquipos.data) ? resEquipos.data : [];
      const listaExamenes = Array.isArray(resExamenes.data) ? resExamenes.data : [];

      setEquipos(listaEquipos);
      setExamenes(listaExamenes);

      if (listaExamenes.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          examen_id: prev.examen_id || listaExamenes[0].id 
        }));
      }
    } catch (err) {
      console.error('Error al consultar la API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examen_id || !formData.tiempo_uso_minutos) {
      alert('Debe seleccionar un examen y especificar los minutos de uso');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipoData: {
          sede_id: selectedSede,
          nombre: formData.nombre,
          valor_compra: Number(formData.valor_compra),
          vida_util_meses: Number(formData.vida_util_meses),
          costo_mantenimiento_anual: Number(formData.costo_mantenimiento_anual || 0),
          minutos_disponibles_mes: Number(formData.minutos_disponibles_mes)
        },
        examenId: formData.examen_id,
        tiempoUsoMinutos: Number(formData.tiempo_uso_minutos)
      };

      await api.post('/equipos', payload);

      setFormData({
        nombre: '',
        valor_compra: '',
        vida_util_meses: '',
        costo_mantenimiento_anual: '',
        minutos_disponibles_mes: '',
        examen_id: examenes[0]?.id || '',
        tiempo_uso_minutos: ''
      });

      await cargarDatos();
    } catch (err) {
      alert('Error guardando equipo: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (equipoId) => {
    if (!window.confirm('¿Desea eliminar este equipo biomédico?')) return;
    try {
      await api.delete(`/equipos/${equipoId}`);
      await cargarDatos();
    } catch (err) {
      alert('Error al eliminar equipo: ' + (err.response?.data?.error || err.message));
    }
  };

  const calcularCIPS = (eq, tiempoMinutos) => {
    const depMes = Number(eq.valor_compra || 0) / Number(eq.vida_util_meses || 1);
    const mantMes = Number(eq.costo_mantenimiento_anual || 0) / 12;
    const costoMesTotal = depMes + mantMes;
    const costoMinuto = costoMesTotal / Number(eq.minutos_disponibles_mes || 1);
    return costoMinuto * Number(tiempoMinutos || 0);
  };

  if (loading) {
    return <div className="p-6 text-slate-600 font-medium">Cargando inventario de equipos biomédicos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Módulo de Equipos Biomédicos y Depreciación CIPS</h1>
        <p className="text-sm text-slate-500 mt-1">Sede Activa: <span className="font-semibold text-blue-600 capitalize">{selectedSede}</span></p>
      </header>

      {equipos.some((equipo) => equipo.ubicacion_estimada) && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          La ubicación de estos activos se estimó en Ibagué por ser la sede principal; confirme la asignación antes de tratarla como inventario físico definitivo.
        </p>
      )}

      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Registrar Nuevo Equipo Biomédico</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Equipo</label>
            <input required name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej: Ecocardiógrafo Vivid E95" className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Valor de Compra ($)</label>
            <input required type="number" name="valor_compra" value={formData.valor_compra} onChange={handleInputChange} placeholder="180000000" className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Vida Útil (Meses)</label>
            <input required type="number" name="vida_util_meses" value={formData.vida_util_meses} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Mantenimiento Anual ($)</label>
            <input type="number" name="costo_mantenimiento_anual" value={formData.costo_mantenimiento_anual} onChange={handleInputChange} placeholder="12000000" className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Min. Disponibles/Mes</label>
            <input required type="number" name="minutos_disponibles_mes" value={formData.minutos_disponibles_mes} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Examen Principal Asociado</label>
            <select name="examen_id" value={formData.examen_id} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {examenes.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.nombre} ({ex.codigo_cups || 'Sin CUPS'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Uso por Examen (Minutos)</label>
            <input required type="number" name="tiempo_uso_minutos" value={formData.tiempo_uso_minutos} onChange={handleInputChange} placeholder="45" className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div className="md:col-span-2 lg:col-span-4 mt-2">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
              {saving ? 'Guardando en Servidor...' : 'Guardar y Vincular Equipo'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <th className="p-3">Equipo Biomédico</th>
              <th className="p-3">Valor Activo</th>
              <th className="p-3">Depreciación/Mes</th>
              <th className="p-3">Mantenimiento/Mes</th>
              <th className="p-3">Examen Asignado</th>
              <th className="p-3">Min. Uso</th>
              <th className="p-3">CIPS Unitario ($)</th>
              <th className="p-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {equipos.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-slate-500 italic">No hay equipos biomédicos registrados en esta sede.</td>
              </tr>
            ) : (
              equipos.map(eq => {
                const depMes = Number(eq.valor_compra || 0) / Number(eq.vida_util_meses || 1);
                const mantMes = Number(eq.costo_mantenimiento_anual || 0) / 12;
                const asignaciones = eq.servicio_equipo || [];

                return asignaciones.length > 0 ? (
                  asignaciones.map((asig, idx) => {
                    const cipsVal = calcularCIPS(eq, asig.tiempo_uso_minutos);
                    return (
                      <tr key={`${eq.id}-${asig.id}`} className="hover:bg-slate-50">
                        {idx === 0 && (
                          <>
                            <td rowSpan={asignaciones.length} className="p-3 font-semibold text-slate-800 align-top">{eq.nombre}</td>
                            <td rowSpan={asignaciones.length} className="p-3 align-top">${Number(eq.valor_compra).toLocaleString()}</td>
                            <td rowSpan={asignaciones.length} className="p-3 align-top">${depMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td rowSpan={asignaciones.length} className="p-3 align-top">${mantMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          </>
                        )}
                        <td className="p-3">{asig.examenes?.nombre || asig.examen_id}</td>
                        <td className="p-3">{asig.tiempo_uso_minutos} min</td>
                        <td className="p-3 font-bold text-emerald-600">
                          ${cipsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {idx === 0 && (
                          <td rowSpan={asignaciones.length} className="p-3 text-center align-top">
                            <button onClick={() => handleDelete(eq.id)} className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded transition-colors">
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr key={eq.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{eq.nombre}</td>
                    <td className="p-3">${Number(eq.valor_compra).toLocaleString()}</td>
                    <td className="p-3">${depMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3">${mantMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td colSpan="3" className="p-3 text-slate-400 italic">Sin examen vinculado</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDelete(eq.id)} className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded transition-colors">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}