import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon, { Avatar } from './Icon';

export default function ProjectMembersModal({ projectId, members, onClose, onChanged }) {
  const [users, setUsers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data.filter((u) => u.active))).catch(() => {});
  }, []);

  const memberIds = new Set(members.map((m) => m.user.id));
  const availableUsers = users.filter((u) => !memberIds.has(u.id));

  async function handleAdd(e) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setAdding(true);
    try {
      await api.post(`/projects/${projectId}/members`, { userId: selected });
      setSelected('');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo agregar al usuario.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId) {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    onChanged();
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Equipo de la empresa</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mb-4 max-h-56 space-y-1 overflow-y-auto">
          {members.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <span className="flex items-center gap-2.5 text-sm">
                <Avatar name={m.user.fullName} className="h-7 w-7 text-[10px]" />
                {m.user.fullName}
              </span>
              <button onClick={() => handleRemove(m.user.id)} className="text-slate-300 hover:text-red-500">
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {members.length === 0 && <p className="px-2 py-1.5 text-sm text-slate-400">Sin miembros todavía.</p>}
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 border-t border-slate-100 pt-4">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputCls}>
            <option value="">Agregar persona...</option>
            {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
          <button type="submit" disabled={!selected || adding} className="shrink-0 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}
