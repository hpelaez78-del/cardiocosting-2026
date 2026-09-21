import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useSedeContext } from '../context/SedeContext';

export default function EvaluadorSede() {
  const { sedes, selectedSede, setSelectedSede } = useSedeContext();
  const [evaluacion, setEvaluacion] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSede) return;
    setLoading(true);
    api.get(`/evaluador/sede/${selectedSede}`)
      .then((res) => {
        const rows = Array.isArray(res?.data?.evaluacion) ? res.data.evaluacion : [];
        setEvaluacion({ ...res.data, evaluacion: rows });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al evaluar la sede:', err.response?.data?.error || err.message);
        setEvaluacion({ evaluacion: [] });
        setLoading(false);
      });
  }, [selectedSede]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Evaluación Financiera por Sede</h1>
        <select
          value={selectedSede}
          onChange={(e) => setSelectedSede(e.target.value)}
          className="border p-2 rounded-lg bg-white shadow-sm"
        >
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre || `Sede #${s.id}`}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Calculando estructura de costos...</p>
      ) : evaluacion?.evaluacion?.length ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-sm text-gray-600">
                <th className="p-3">Examen</th>
                <th className="p-3">Tarifa Convenio</th>
                <th className="p-3">Costo Directo</th>
                <th className="p-3">Utilidad</th>
                <th className="p-3">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {evaluacion.evaluacion.map((item) => (
                <tr key={item.examenId} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.nombre}</td>
                  <td className="p-3">${Number(item.tarifaConvenio || 0).toLocaleString()}</td>
                  <td className="p-3 text-red-600">${Number(item.costoTotal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className={`p-3 font-bold ${Number(item.utilidad || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Number(item.utilidad || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${Number(item.margenPct || 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {Number(item.margenPct || 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Seleccione una sede para ver el análisis de costos.</p>
      )}
    </div>
  );
}