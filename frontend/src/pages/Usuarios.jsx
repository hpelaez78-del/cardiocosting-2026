import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

const tabs = [
  { id: 'roles', label: 'Perfiles' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'perfil', label: 'Mi perfil' },
];

const MODULOS_PERMISO = [
  'dashboard',
  'sedes',
  'personal',
  'convenios',
  'insumos',
  'simulador',
  'usuarios',
];

const ACCIONES_PERMISO = ['view', 'create', 'edit', 'delete'];

const permisosBase = () =>
  MODULOS_PERMISO.reduce(
    (acc, modulo) => ({
      ...acc,
      [modulo]: ACCIONES_PERMISO.reduce((accAcc, accion) => ({ ...accAcc, [accion]: false }), {}),
    }),
    {}
  );

export default function Usuarios() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  const [newRole, setNewRole] = useState({ nombre: '', descripcion: '', permisos: permisosBase() });
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    password: '',
    role_id: '',
    sede_id: '',
    activo: true,
  });
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    email: '',
    password: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usuariosRes, sedesRes] = await Promise.all([
        api.get('/roles'),
        api.get('/usuarios'),
        api.get('/sedes'),
      ]);

      setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
      setUsuarios(Array.isArray(usuariosRes?.data) ? usuariosRes.data : []);
      setSedes(Array.isArray(sedesRes?.data) ? sedesRes.data : []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudieron cargar los usuarios y roles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerfil = async () => {
    try {
      const res = await api.get('/usuarios/perfil');
      setProfile(res.data || null);
      setProfileForm({
        nombre: res.data?.nombre || '',
        email: res.data?.email || '',
        password: '',
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo cargar el perfil.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'perfil') {
      fetchPerfil();
    }
  }, [activeTab]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setCreatingRole(true);
    setError('');

    try {
      await api.post('/roles', newRole);
      setNewRole({ nombre: '', descripcion: '', permisos: permisosBase() });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear el rol.');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setError('');

    try {
      await api.post('/usuarios', {
        ...newUser,
        role_id: newUser.role_id ? Number(newUser.role_id) : null,
        perfil_id: newUser.role_id ? Number(newUser.role_id) : null,
        sede_id: newUser.sede_id || null,
      });

      setNewUser({ nombre: '', email: '', password: '', role_id: '', sede_id: '', activo: true });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear el usuario.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUsuario = async (usuario) => {
    setSaving(true);
    setError('');

    try {
      await api.put(`/usuarios/${usuario.id}`, {
        activo: !usuario.activo,
      });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermisos = async (usuarioId, payload) => {
    setSaving(true);
    setError('');

    try {
      await api.put(`/usuarios/${usuarioId}`, {
        ...payload,
        role_id: payload.role_id ?? payload.perfil_id ?? null,
        perfil_id: payload.role_id ?? payload.perfil_id ?? null,
      });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar el permiso del usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');

    try {
      const payload = {
        nombre: profileForm.nombre,
        email: profileForm.email,
        ...(profileForm.password ? { password: profileForm.password } : {}),
      };

      const res = await api.put('/usuarios/perfil', payload);
      const usuarioGuardado = res?.data?.data || res?.data || null;

      if (usuarioGuardado?.nombre || usuarioGuardado?.email) {
        const stored = JSON.parse(localStorage.getItem('usuario') || '{}');
        localStorage.setItem('usuario', JSON.stringify({ ...stored, ...usuarioGuardado }));
      }

      await fetchPerfil();
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const usuariosFiltrados = filterRole === 'all'
    ? usuarios
    : usuarios.filter((usuario) => String(usuario.role_id ?? '') === String(filterRole));

  const parsePermisos = (permisosRaw) => {
    if (!permisosRaw) return {};
    if (typeof permisosRaw === 'string') {
      try {
        return JSON.parse(permisosRaw);
      } catch {
        return {};
      }
    }
    return typeof permisosRaw === 'object' ? permisosRaw : {};
  };

  if (loading) return <div className="p-8 text-slate-600">Cargando usuarios, roles y perfiles...</div>;

  return (
    <div className="space-y-6 p-1">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Perfiles</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Roles del sistema</h3>
          </div>

          <form onSubmit={handleCreateRole} className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[1.2fr_2fr_auto]">
              <input
                value={newRole.nombre}
                onChange={(e) => setNewRole({ ...newRole, nombre: e.target.value })}
                placeholder="Nombre del rol"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
                required
              />
              <input
                value={newRole.descripcion}
                onChange={(e) => setNewRole({ ...newRole, descripcion: e.target.value })}
                placeholder="Descripción del perfil"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
              />
              <button type="submit" disabled={creatingRole} className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white disabled:opacity-60">
                {creatingRole ? 'Guardando...' : 'Agregar rol'}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {MODULOS_PERMISO.map((modulo) => (
                <div key={modulo} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-800 capitalize">{modulo}</p>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {ACCIONES_PERMISO.map((accion) => (
                      <label key={`${modulo}-${accion}`} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(newRole.permisos?.[modulo]?.[accion])}
                          onChange={(e) => setNewRole({
                            ...newRole,
                            permisos: {
                              ...newRole.permisos,
                              [modulo]: {
                                ...newRole.permisos?.[modulo],
                                [accion]: e.target.checked,
                              },
                            },
                          })}
                        />
                        <span className="capitalize">{accion === 'view' ? 'Ver' : accion === 'create' ? 'Crear' : accion === 'edit' ? 'Editar' : 'Eliminar'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </form>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((rol) => {
              const permisosObj = parsePermisos(rol.permisos);
              return (
                <div key={rol.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                      {rol.nombre}
                    </span>
                    <span className="text-xs text-slate-500">#{rol.id}</span>
                  </div>
                  <p className="mb-3 text-sm text-slate-600">{rol.descripcion || 'Sin descripción'}</p>
                  <div className="space-y-2">
                    {Object.entries(permisosObj).map(([modulo, acciones]) => {
                      const accionesHabilitadas = typeof acciones === 'object' && acciones !== null
                        ? Object.entries(acciones)
                            .filter(([, enabled]) => Boolean(enabled))
                            .map(([key]) => key)
                        : [];
                      return accionesHabilitadas.length > 0 ? (
                        <div key={modulo} className="text-xs">
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 capitalize">
                            {modulo}:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {accionesHabilitadas.map((accion) => (
                              <span key={`${modulo}-${accion}`} className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan-700">
                                {accion}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'usuarios' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Usuarios</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Gestión de accesos</h3>
          </div>

          <form onSubmit={handleCreateUser} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-6">
            <input
              value={newUser.nombre}
              onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
              placeholder="Nombre completo"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 lg:col-span-2"
              required
            />
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="Correo electrónico"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
              required
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Contraseña"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
              required
            />
            <select
              value={newUser.role_id}
              onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
            >
              <option value="">Perfil</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
              ))}
            </select>
            <select
              value={newUser.sede_id}
              onChange={(e) => setNewUser({ ...newUser, sede_id: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
            >
              <option value="">Sede</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            <button type="submit" disabled={creatingUser} className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-60">
              {creatingUser ? 'Creando...' : 'Agregar usuario'}
            </button>
          </form>

          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filtrar por perfil</p>
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">Todos los perfiles</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Correo</th>
                  <th className="px-4 py-3 font-semibold">Perfil / Permiso</th>
                  <th className="px-4 py-3 font-semibold">Sede</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{usuario.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={usuario.role_id ?? ''}
                        onChange={(e) => handleUpdatePermisos(usuario.id, { role_id: e.target.value ? Number(e.target.value) : null, perfil_id: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700"
                      >
                        <option value="">Sin perfil</option>
                        {roles.map((rol) => (
                          <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={usuario.sede_id ?? ''}
                        onChange={(e) => handleUpdatePermisos(usuario.id, { sede_id: e.target.value || null })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700"
                      >
                        <option value="">Sin sede</option>
                        {sedes.map((sede) => (
                          <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleUsuario(usuario)}
                        disabled={saving}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${usuario.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleUsuario(usuario)}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
                      >
                        Guardar estado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'perfil' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Mi perfil</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Datos del usuario autenticado</h3>
          </div>

          <form onSubmit={handleSavePerfil} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-600">Nombre completo</label>
              <input
                value={profileForm.nombre}
                onChange={(e) => setProfileForm({ ...profileForm, nombre: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Correo electrónico</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Nueva contraseña</label>
              <input
                type="password"
                value={profileForm.password}
                onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                placeholder="Dejar vacío para conservar la actual"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Estado actual</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                <span className="rounded-full bg-white px-3 py-1 font-medium">
                  {profile?.rol_nombre || 'Sin perfil'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium">
                  {profile?.sede_nombre || 'Sin sede'}
                </span>
                <span className={`rounded-full px-3 py-1 font-medium ${profile?.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  {profile?.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}