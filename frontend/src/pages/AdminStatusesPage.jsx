import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminStatusesPage() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', order: 0, isDefault: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function fetchStatuses() {
    setLoading(true);
    return api.get('/statuses').then((res) => setStatuses(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => { fetchStatuses(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/statuses', { name: form.name, order: Number(form.order), isDefault: form.isDefault });
      setForm({ name: '', order: 0, isDefault: false });
      fetchStatuses();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el estatus.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(status) {
    if (!window.confirm(`¿Eliminar el estatus "${status.name}"? Esto puede fallar si hay clientes usándolo.`)) return;
    try {
      await api.delete(`/statuses/${status.id}`);
      fetchStatuses();
    } catch {
      window.alert('No se pudo eliminar: probablemente hay clientes con este estatus.');
    }
  }

  async function setDefault(status) {
    await api.patch(`/statuses/${status.id}`, { isDefault: true });
    fetchStatuses();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Estatus de clientes</h1>
        <p className="mt-0.5 text-sm text-slate-500">Configura las etapas del pipeline de clientes</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Nuevo estatus</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nombre</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Orden</label>
            <input type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Por defecto
          </label>
          <button type="submit" disabled={saving}
            className="rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear'}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Nombre</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Orden</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Por defecto</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr>
            ) : statuses.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-2 text-slate-600">{s.order}</td>
                <td className="px-4 py-2">
                  {s.isDefault ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Sí</span>
                  ) : (
                    <button onClick={() => setDefault(s)} className="text-xs font-medium text-orange-600 hover:underline">Hacer por defecto</button>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDelete(s)} className="text-xs font-medium text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
