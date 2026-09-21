import { createContext, useContext, useMemo, useState } from 'react';

const SedeContext = createContext(null);

export function SedeProvider({ children }) {
  const [sedes, setSedes] = useState([]);
  const [selectedSede, setSelectedSede] = useState(() => {
    try {
      return localStorage.getItem('selectedSede') || 'ibague';
    } catch {
      return 'ibague';
    }
  });

  const value = useMemo(
    () => ({ sedes, setSedes, selectedSede, setSelectedSede }),
    [sedes, selectedSede]
  );

  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>;
}

export function useSedeContext() {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error('useSedeContext debe usarse dentro de SedeProvider');
  }
  return context;
}
