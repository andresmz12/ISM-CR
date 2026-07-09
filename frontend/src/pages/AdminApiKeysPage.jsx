import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // La llave en claro solo se muestra una vez, justo después de crearla.
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  function fetchKeys() {
    setLoading(true);
    return api.get('/api-keys').then((res) => setKeys(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => { fetchKeys(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/api-keys', { name });
      setNewKey(res.data);
      setCopied(false);
      setName('');
      fetchKeys();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la llave.');
    } finally {
      setSaving(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function toggleActive(k) {
    await api.patch(`/api-keys/${k.id}`, { active: !k.active });
    fetchKeys();
  }

  async function handleDelete(k) {
    if (!window.confirm(`¿Eliminar la llave "${k.name}"? Las integraciones que la usen dejarán de funcionar.`)) return;
    await api.delete(`/api-keys/${k.id}`);
    fetchKeys();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">API Keys</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Llaves para integraciones externas (formularios web, otras apps). Se envían en el header <code className="rounded bg-slate-100 px-1">x-api-key</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Nueva llave</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Nombre (para qué se usa)</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Formulario del sitio web" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="rounded-md bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear llave'}
          </button>
        </form>

        {newKey && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Llave creada. Cópiala ahora — no se volverá a mostrar:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-amber-200">{newKey.key}</code>
              <button onClick={copyKey}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
                <Icon name="copy" className="h-4 w-4" />
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Nombre</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Estado</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Último uso</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Creada</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr>
              ) : keys.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{k.name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {k.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Nunca'}</td>
                  <td className="px-4 py-2 text-slate-600">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => toggleActive(k)} className="text-xs font-medium text-orange-600 hover:underline">
                        {k.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => handleDelete(k)} className="text-xs font-medium text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && keys.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin llaves creadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
