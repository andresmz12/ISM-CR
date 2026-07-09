import { useState } from 'react';
import api from '../api/client';

export default function NewClientModal({ statuses, agents, onClose, onCreated }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', phoneAlt: '', email: '', address: '',
    statusId: '', assignedAgentId: '', source: '', tags: '',
  });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        phoneAlt: form.phoneAlt || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        statusId: form.statusId || undefined,
        assignedAgentId: form.assignedAgentId || undefined,
        source: form.source || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };
      const res = await api.post('/clients', payload);
      if (res.data.duplicateWarning) {
        setWarning(res.data.duplicateWarning);
      }
      onCreated(res.data);
      if (!res.data.duplicateWarning) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nuevo cliente</h2>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {warning && (
          <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Posible duplicado: ya existe un cliente con este teléfono ({warning.map((w) => w.fullName).join(', ')}).
            El cliente se creó de todos modos.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo *</label>
            <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono *</label>
              <input required value={form.phone} onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono alterno</label>
              <input value={form.phoneAlt} onChange={(e) => update('phoneAlt', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
            <input value={form.address} onChange={(e) => update('address', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estatus</label>
              <select value={form.statusId} onChange={(e) => update('statusId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">(por defecto)</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Agente asignado</label>
              <select value={form.assignedAgentId} onChange={(e) => update('assignedAgentId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Sin asignar</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Origen</label>
              <input value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Facebook, referido..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Etiquetas</label>
              <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="vip, mayoreo"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
