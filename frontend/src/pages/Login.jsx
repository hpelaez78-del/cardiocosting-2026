import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Stethoscope } from 'lucide-react';
import api from '../api/axiosConfig';

export default function Login() {
  const [email, setEmail] = useState('gerencia@cardiologiasigloxxi.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });

      localStorage.setItem('token', res.data.token);
      if (res.data.usuario) {
        localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      }

      navigate('/');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al conectar con el servidor. Revisa tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/40 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_40%),linear-gradient(135deg,_#0f172a,_#111827)] p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)]" />
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <Activity className="h-3.5 w-3.5" />
              CardioCosting 2026
            </div>
            <h1 className="max-w-md text-4xl font-black tracking-tight text-white">
              Control financiero clínico y operativo para la red de atención.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Centraliza costos, rentabilidad por procedimiento, convenios y simulación de escenarios del negocio médico.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Datos seguros y trazables</p>
                <p className="text-xs text-slate-400">Autenticación JWT y control por rol</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operación clínica y financiera</p>
                <p className="text-xs text-slate-400">Módulos de sede, personal, tarifas y simulación</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Acceso autorizado</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Iniciar sesión</h2>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="gerencia@cardiologiasigloxxi.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Validando credenciales...' : 'Ingresar al dashboard'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-400">
              Credencial válida verificada: <span className="font-semibold text-cyan-300">gerencia@cardiologiasigloxxi.com</span> / <span className="font-semibold text-cyan-300">Admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}