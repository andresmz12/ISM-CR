import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel de marca */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-orange-500/30">
            ISM
          </span>
          <span className="text-lg font-semibold text-white">ISM CRM</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
            Todos tus clientes, en un solo lugar.
          </h1>
          <p className="mt-4 max-w-md text-zinc-400">
            Seguimiento comercial, historial de interacciones y tareas del día para todo el equipo.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Icon name="clients" className="h-4 w-4 text-orange-400" /> Pipeline visual</div>
            <div className="flex items-center gap-2"><Icon name="activity" className="h-4 w-4 text-orange-400" /> Actividad en tiempo real</div>
            <div className="flex items-center gap-2"><Icon name="upload" className="h-4 w-4 text-orange-400" /> Importación desde Excel</div>
          </div>
        </div>
        <div className="relative text-xs text-zinc-600">© {new Date().getFullYear()} ISM Consulting Services</div>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white">
              ISM
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h2>
          <p className="mb-8 mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta del equipo</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            placeholder="tu@empresa.com"
          />

          <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
