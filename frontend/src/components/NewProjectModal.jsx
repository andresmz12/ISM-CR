import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon, { Avatar } from './Icon';

export default function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', repoUrl: '' });
  const [users, setUsers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data.filter((u) => u.active))).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMember(id) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/projects', {
        name: form.name,
        description: form.description || undefined,
        repoUrl: form.repoUrl || undefined,
        memberIds,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el proyecto.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nuevo proyecto</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputCls} placeholder="Ej. App de Paquetería" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Repositorio</label>
            <input value={form.repoUrl} onChange={(e) => update('repoUrl', e.target.value)} className={inputCls} placeholder="https://github.com/..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Equipo del proyecto</label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <Avatar name={u.fullName} className="h-6 w-6 text-[9px]" />
                  {u.fullName}
                </label>
              ))}
              {users.length === 0 && <p className="px-2 py-1.5 text-sm text-slate-400">Sin usuarios disponibles.</p>}
            </div>
            <p className="mt-1 text-xs text-slate-400">Solo estas personas verán este proyecto (además de Admin/Supervisor).</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
