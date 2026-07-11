import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import BrandMark from '../components/BrandMark';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/projects', { replace: true });
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel de marca — visible desde tablet en adelante */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 md:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark className="h-10 w-10" imgClassName="h-7 w-7" />
          <span className="text-lg font-semibold text-white">ISM CRM</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
            Todos tus contactos, en un solo lugar.
          </h1>
          <p className="mt-4 max-w-md text-zinc-400">
            Seguimiento comercial, historial de interacciones y tareas del día para todo el equipo.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Icon name="clients" className="h-4 w-4 text-orange-400" /> Seguimiento por contactos</div>
            <div className="flex items-center gap-2"><Icon name="activity" className="h-4 w-4 text-orange-400" /> Actividad en tiempo real</div>
            <div className="flex items-center gap-2"><Icon name="upload" className="h-4 w-4 text-orange-400" /> Importación desde Excel</div>
          </div>
        </div>
        <div className="relative text-xs text-zinc-600">© {new Date().getFullYear()} ISM Consulting Services</div>
      </div>

      {/* Formulario — con textura propia para que nunca se vea vacío, con o sin el panel de marca */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 p-6">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl md:hidden" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl md:hidden" />

        <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <BrandMark className="h-10 w-10" imgClassName="h-7 w-7" />
            <span className="text-base font-semibold text-slate-900">ISM CRM</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h2>
          <p className="mb-8 mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta del equipo</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
          <div className="relative mb-4">
            <Icon name="mail" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
          <div className="relative mb-6">
            <Icon name="lock" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            ¿Problemas para ingresar? Contacta a tu administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
