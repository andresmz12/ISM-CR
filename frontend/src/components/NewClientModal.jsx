import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

export default function NewClientModal({ statuses, agents, companies = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', phoneAlt: '', email: '', address: '',
    statusId: '', assignedAgentId: '', companyId: '', source: '', tags: '',
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
        assignedAgentId: form.assignedAgentId === '__auto__' ? undefined : (form.assignedAgentId || undefined),
        autoAssign: form.assignedAgentId === '__auto__' || undefined,
        companyId: form.companyId || undefined,
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

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nuevo cliente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {warning && (
          <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Posible duplicado: ya existe un cliente con este teléfono ({warning.map((w) => w.fullName).join(', ')}).
            El cliente se creó de todos modos.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo *</label>
            <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono *</label>
              <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono alterno</label>
              <input value={form.phoneAlt} onChange={(e) => update('phoneAlt', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
            <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estatus</label>
              <select value={form.statusId} onChange={(e) => update('statusId', e.target.value)} className={inputCls}>
                <option value="">(por defecto)</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Agente asignado</label>
              <select value={form.assignedAgentId} onChange={(e) => update('assignedAgentId', e.target.value)} className={inputCls}>
                <option value="">Sin asignar</option>
                {agents.length > 0 && <option value="__auto__">Automático (al agente con menos clientes)</option>}
                {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Empresa</label>
            <select value={form.companyId} onChange={(e) => update('companyId', e.target.value)} className={inputCls}>
              <option value="">Sin empresa</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Origen</label>
              <input value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Facebook, referido..." className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Etiquetas</label>
              <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="vip, mayoreo" className={inputCls} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
