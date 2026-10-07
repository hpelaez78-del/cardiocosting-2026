import { 
  LayoutGrid, 
  FileSpreadsheet, 
  LogOut, 
  Stethoscope, 
  Building2, 
  Users, 
  Handshake, 
  Sliders 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Consolidado Multisitio', icon: LayoutGrid },
    { path: '/evaluador', label: 'Evaluador por Sede', icon: FileSpreadsheet },
    { path: '/sedes', label: 'Sedes', icon: Building2 },
    { path: '/personal', label: 'Personal', icon: Users },
    { path: '/equipos', label: 'Equipos Biomédicos', icon: Stethoscope },
    { path: '/convenios', label: 'Convenios', icon: Handshake },
    { path: '/insumos', label: 'Insumos', icon: FileSpreadsheet },
    { path: '/simulador', label: 'Simulador', icon: Sliders },
    { path: '/usuarios', label: 'Usuarios y perfiles', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 bg-[#0b0f19] border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0 min-h-screen select-none">
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
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
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
  );
}