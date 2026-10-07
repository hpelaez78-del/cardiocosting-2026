import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosConfig';

const SedeContext = createContext();

export const SedeProvider = ({ children }) => {
  const [sedes, setSedes] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [convenioSeleccionado, setConvenioSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sedesRes, conveniosRes] = await Promise.all([
        axiosInstance.get('/sedes'),
        axiosInstance.get('/convenios')
      ]);

      const listaSedes = Array.isArray(sedesRes.data) ? sedesRes.data : [];
      const listaConvenios = Array.isArray(conveniosRes.data) ? conveniosRes.data : [];

      setSedes(listaSedes);
      setConvenios(listaConvenios);

      if (listaSedes.length > 0 && !listaSedes.some((sede) => String(sede.id) === String(sedeSeleccionada?.id))) {
        setSedeSeleccionada(listaSedes[0]);
      } else if (listaSedes.length === 0) {
        setSedeSeleccionada(null);
      }
      if (listaConvenios.length > 0 && !listaConvenios.some((convenio) => String(convenio.id) === String(convenioSeleccionado?.id))) {
        setConvenioSeleccionado(listaConvenios[0]);
      } else if (listaConvenios.length === 0) {
        setConvenioSeleccionado(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al inicializar sedes o convenios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const seleccionarSede = (sedeId) => {
    const sede = sedes.find((item) => String(item.id) === String(sedeId));
    setSedeSeleccionada(sede || null);
  };

  const seleccionarConvenio = (convenioId) => {
    const convenio = convenios.find((item) => String(item.id) === String(convenioId));
    setConvenioSeleccionado(convenio || null);
  };

  return (
    <SedeContext.Provider
      value={{
        sedes,
        convenios,
        sedeSeleccionada,
        setSedeSeleccionada: seleccionarSede,
        convenioSeleccionado,
        setConvenioSeleccionado: seleccionarConvenio,
        selectedSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : '',
        setSelectedSede: seleccionarSede,
        selectedConvenio: convenioSeleccionado?.id ? String(convenioSeleccionado.id) : '',
        setSelectedConvenio: seleccionarConvenio,
        loading,
        error,
        recargarContexto: cargarDatosIniciales
      }}
    >
      {children}
    </SedeContext.Provider>
  );
};

export const useSede = () => {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error('useSede debe ser utilizado dentro de un SedeProvider');
  }
  return context;
};

// Exportaciones adicionales para resolver la compatibilidad con AppShell.jsx
export const useSedeContext = useSede;
export default SedeContext;