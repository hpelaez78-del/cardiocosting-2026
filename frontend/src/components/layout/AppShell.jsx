import React from 'react';
import { 
  LayoutGrid, 
  FileSpreadsheet, 
  LogOut, 
  Stethoscope, 
  Building2, 
  Users, 
  Handshake, 
  Sliders,
  MapPin,
  Settings2
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSedeContext } from '../../context/SedeContext';

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    sedes,
    convenios,
    selectedSede,
    setSelectedSede,
    selectedConvenio,
    setSelectedConvenio
  } = useSedeContext();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const hasModulePermission = (modulo) => {
    try {
      const stored = localStorage.getItem('usuario');
      if (!stored) return true;
      const usuario = JSON.parse(stored);

      const rol = String(usuario.rol || usuario.role || usuario.rol_nombre || '').toUpperCase();
      if (rol === 'ADMINISTRADOR' || usuario.id === 1) return true;

      const permisos = usuario.permisos;
      if (Array.isArray(permisos)) return permisos.length === 0 || permisos.includes(modulo);
      if (typeof permisos === 'object' && permisos !== null) {
        if (permisos[modulo] === undefined) return true;
        if (typeof permisos[modulo] === 'object') return permisos[modulo].view !== false;
        return Boolean(permisos[modulo]);
      }
      return true;
    } catch {
      return true;
    }
  };

  const navItems = [
    { path: '/', label: 'Consolidado Multisitio', icon: LayoutGrid, key: 'dashboard' },
    { path: '/evaluador', label: 'Evaluador por Sede', icon: FileSpreadsheet, key: 'dashboard' },
    { path: '/sedes', label: 'Sedes', icon: Building2, key: 'sedes' },
    { path: '/personal', label: 'Personal', icon: Users, key: 'personal' },
    { path: '/equipos', label: 'Equipos Biomédicos', icon: Stethoscope, key: 'equipos' },
    { path: '/convenios', label: 'Convenios', icon: Handshake, key: 'convenios' },
    { path: '/insumos', label: 'Insumos', icon: FileSpreadsheet, key: 'insumos' },
    { path: '/simulador', label: 'Simulador', icon: Sliders, key: 'simulador' },
    { path: '/usuarios', label: 'Usuarios y perfiles', icon: FileSpreadsheet, key: 'usuarios' },
    { path: '/configuracion-costeo', label: 'Configuración de costeo', icon: Settings2, key: 'configuracion' },
  ].filter((item) => hasModulePermission(item.key));

  let nombreUsuario = 'Usuario';
  let rolUsuario = 'ADMINISTRADOR';
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (u.nombre) nombreUsuario = u.nombre;
    else if (u.username) nombreUsuario = u.username;
    else if (u.email) nombreUsuario = u.email.split('@')[0];
    if (u.rol || u.role) rolUsuario = u.rol || u.role;
  } catch {}

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Menú Lateral Sidebar */}
      <aside className="w-64 bg-[#0b0f19] border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 min-h-screen select-none">
        <div>
          <div className="mb-8 px-2 pt-2">
            <h1 className="text-xl font-bold text-white tracking-tight">CardioCosting</h1>
            <p className="text-xs text-slate-400 mt-0.5">Cardiología Siglo XXI 2026</p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 text-slate-900">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-6">
            {/* Selector de Sede */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sede:</span>
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                {sedes.length === 0 && <option value="">Sin sedes disponibles</option>}
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre || String(s.id).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Convenio */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <Handshake className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Convenio:</span>
              <select
                value={selectedConvenio}
                onChange={(e) => setSelectedConvenio(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
              >
                {convenios.length === 0 && <option value="">Sin convenios disponibles</option>}
                {convenios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_eps || `Convenio #${c.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Perfil del Usuario */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800 capitalize">{nombreUsuario}</p>
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{rolUsuario}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-100 text-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}