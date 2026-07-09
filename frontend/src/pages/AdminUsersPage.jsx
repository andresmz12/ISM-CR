import { useEffect, useState } from 'react';
import api from '../api/client';

const ROLES = ['ADMIN', 'SUPERVISOR', 'AGENT'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'AGENT' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function fetchUsers() {
    setLoading(true);
    return api.get('/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      setForm({ fullName: '', email: '', password: '', role: 'AGENT' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    await api.patch(`/users/${user.id}`, { active: !user.active });
    fetchUsers();
  }

  async function changeRole(user, role) {
    await api.patch(`/users/${user.id}`, { role });
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Nuevo usuario</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nombre completo</label>
            <input required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Correo</label>
            <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Contraseña</label>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Rol</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear'}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Correo</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Rol</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Estatus</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{u.fullName}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2">
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleActive(u)} className="text-xs font-medium text-indigo-600 hover:underline">
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
