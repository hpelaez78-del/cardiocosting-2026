import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { SedeProvider } from './context/SedeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EvaluadorSede from './pages/EvaluadorSede';
import Sedes from './pages/Sedes';
import Personal from './pages/Personal';
import Convenios from './pages/Convenios';
import Insumos from './pages/Insumos';
import Equipos from './pages/Equipos';
import Simulador from './pages/Simulador';
import Usuarios from './pages/Usuarios';
import ConfiguracionCosteo from './pages/ConfiguracionCosteo';

const hasModulePermission = (modulo, accion = 'view') => {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    // Si el usuario es ADMINISTRADOR, otorgar acceso completo por defecto
    if (usuario.rol === 'ADMINISTRADOR' || usuario.role === 'ADMINISTRADOR') {
      return true;
    }

    const permisos = usuario.permisos;
    
    // Si los permisos vienen como array de strings (ej. ['dashboard', 'sedes'])
    if (Array.isArray(permisos)) {
      return permisos.includes(modulo);
    }

    // Si los permisos vienen como objeto estructurado { dashboard: { view: true } }
    if (typeof permisos === 'object' && permisos !== null) {
      return !!permisos?.[modulo]?.[accion];
    }

    // Si no hay objeto de permisos definido, permitir acceso si hay token activo
    return true;
  } catch {
    return false;
  }
};

const ProtectedRoute = ({ children, requiredPermission, requiredAction = 'view' }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (requiredPermission && !hasModulePermission(requiredPermission, requiredAction)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const withShell = (PageComponent) => (
  <AppShell>
    <PageComponent />
  </AppShell>
);

export default function App() {
  return (
    <BrowserRouter>
      <SedeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute requiredPermission="dashboard">
                {withShell(Dashboard)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluador"
            element={
              <ProtectedRoute requiredPermission="dashboard">
                {withShell(EvaluadorSede)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/sedes"
            element={
              <ProtectedRoute requiredPermission="sedes">
                {withShell(Sedes)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal"
            element={
              <ProtectedRoute requiredPermission="personal">
                {withShell(Personal)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipos"
            element={
              <ProtectedRoute requiredPermission="equipos">
                {withShell(Equipos)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/convenios"
            element={
              <ProtectedRoute requiredPermission="convenios">
                {withShell(Convenios)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/insumos"
            element={
              <ProtectedRoute requiredPermission="insumos">
                {withShell(Insumos)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulador"
            element={
              <ProtectedRoute requiredPermission="simulador">
                {withShell(Simulador)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute requiredPermission="usuarios">
                {withShell(Usuarios)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion-costeo"
            element={
              <ProtectedRoute requiredPermission="configuracion">
                {withShell(ConfiguracionCosteo)}
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SedeProvider>
    </BrowserRouter>
  );
}