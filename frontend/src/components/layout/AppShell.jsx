import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useSedeContext } from '../../context/SedeContext';
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';

const hasModulePermission = (modulo, accion = 'view') => {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    // 1. Pase directo si el rol es ADMINISTRADOR
    if (usuario.rol === 'ADMINISTRADOR' || usuario.role === 'ADMINISTRADOR') {
      return true;
    }

    const permisos = usuario.permisos;
    if (!permisos) return false;

    // 2. Validación si los permisos vienen como un arreglo ['dashboard', 'sedes']
    if (Array.isArray(permisos)) {
      return permisos.includes(modulo);
    }

    // 3. Validación si los permisos son objeto { dashboard: { view: true } } o { dashboard: true }
    if (typeof permisos === 'object') {
      const permModulo = permisos[modulo];
      if (typeof permModulo === 'boolean') return permModulo;
      return !!permModulo?.[accion];
    }

    return false;
  } catch {
    return false;
  }
};

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permiso: 'dashboard' },
  { to: '/evaluador', label: 'Evaluador', icon: Activity, permiso: 'dashboard' },
  { to: '/sedes', label: 'Sedes', icon: Building2, permiso: 'sedes' },
  { to: '/personal', label: 'Personal', icon: Users, permiso: 'personal' },
  { to: '/convenios', label: 'Convenios', icon: Stethoscope, permiso: 'convenios' },
  { to: '/insumos', label: 'Insumos', icon: Activity, permiso: 'insumos' },
  { to: '/simulador', label: 'Simulador', icon: TrendingUp, permiso: 'simulador' },
  { to: '/usuarios', label: 'Usuarios', icon: ShieldCheck, permiso: 'usuarios' },
];

const routeTitles = {
  '/': { title: 'Dashboard', subtitle: 'Rentabilidad y costos por sede' },
  '/evaluador': { title: 'Evaluador', subtitle: 'Análisis financiero por examen' },
  '/sedes': { title: 'Sedes', subtitle: 'Costos fijos y estructura operativa' },
  '/personal': { title: 'Personal', subtitle: 'Nómina y tiempo de atención' },
  '/convenios': { title: 'Convenios', subtitle: 'Tarifas por EPS / convenio' },
  '/insumos': { title: 'Insumos', subtitle: 'Detalle de materiales por examen' },
  '/simulador': { title: 'Simulador', subtitle: 'Escenarios y proyecciones' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Roles, perfiles y accesos del sistema' },
};

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sedes, setSedes, selectedSede, setSelectedSede } = useSedeContext();

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const navItemsFiltradas = navItems.filter((item) => hasModulePermission(item.permiso, 'view'));
  const current = routeTitles[location.pathname] || routeTitles['/'];

  useEffect(() => {
    const loadSedes = async () => {
      try {
        const res = await api.get('/sedes');
        const list = Array.isArray(res?.data) ? res.data : [];
        setSedes(list);
        if (list.length > 0 && (!selectedSede || !list.some((s) => s.id === selectedSede))) {
          setSelectedSede(list[0].id);
        }
      } catch (error) {
        console.error('Error cargando sedes en shell:', error);
      }
    };

    loadSedes();
  }, [selectedSede, setSedes, setSelectedSede]);

  useEffect(() => {
    if (selectedSede) {
      localStorage.setItem('selectedSede', selectedSede);
    }
  }, [selectedSede]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('selectedSede');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 lg:flex">
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/40">
              <Stethoscope className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Cardiología</p>
              <h2 className="text-lg font-bold tracking-tight text-white">Siglo XXI</h2>
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Módulos
            </p>
            <nav className="space-y-1.5">
              {navItemsFiltradas.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/25'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-800 p-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Estado</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-200">Sistema activo</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 lg:hidden">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Operación financiera
                  </p>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">CardioCosting</h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar examen, sede o módulo"
                    className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                <button className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
                  <Bell className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">Sede</span>
                  <select
                    value={selectedSede || ''}
                    onChange={(e) => setSelectedSede(e.target.value)}
                    className="bg-transparent pr-1 text-sm font-semibold text-slate-800 focus:outline-none"
                  >
                    {sedes.length > 0 ? (
                      sedes.map((sede) => (
                        <option key={sede.id} value={sede.id}>
                          {sede.nombre || `Sede ${sede.id}`}
                        </option>
                      ))
                    ) : (
                      <option value="ibague">Ibagué</option>
                    )}
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <CircleUserRound className="h-4 w-4" />
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{usuario.rol || 'Usuario'}</p>
                    <p className="text-sm font-semibold text-slate-800">{usuario.nombre || 'Gerencia'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{current.title}</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {current.subtitle}
                </h2>
              </div>

              <button className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                Exportar resumen
              </button>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}