import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

// Editar nombre y, opcionalmente, forzar una contraseña nueva para el usuario.
// Dejar el campo de contraseña vacío no la cambia.
export default function EditUserModal({ user, onClose, onSaved }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = { fullName };
      if (password) data.password = password;
      await api.patch(`/users/${user.id}`, data);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Editar usuario</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input value={user.email} disabled className={`${inputCls} bg-slate-50 text-slate-400`} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nueva contraseña</label>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiarla"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres. Se le pisa la contraseña actual al usuario.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
