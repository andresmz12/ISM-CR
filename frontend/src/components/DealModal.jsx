import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

const STAGES = [
  { value: 'PROSPECTING', label: 'Prospección' },
  { value: 'QUALIFICATION', label: 'Calificación' },
  { value: 'PROPOSAL', label: 'Propuesta' },
  { value: 'NEGOTIATION', label: 'Negociación' },
  { value: 'WON', label: 'Ganado' },
  { value: 'LOST', label: 'Perdido' },
];

export default function DealModal({ deal, companies, agents, canAssignOwner, onClose, onSaved, onDeleted }) {
  const isEdit = !!deal;
  const [form, setForm] = useState({
    title: deal?.title ?? '',
    clientSearch: deal?.client?.fullName ?? '',
    clientId: deal?.client?.id ?? '',
    companyId: deal?.company?.id ?? '',
    amount: deal?.amount ?? '',
    stage: deal?.stage ?? 'PROSPECTING',
    ownerId: deal?.owner?.id ?? '',
    expectedCloseDate: deal?.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '',
    notes: deal?.notes ?? '',
  });
  const [clientOptions, setClientOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    if (!form.clientSearch || form.clientId) { setClientOptions([]); return; }
    const handle = setTimeout(() => {
      api.get('/clients', { params: { search: form.clientSearch, pageSize: 5 } })
        .then((res) => setClientOptions(res.data.items))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.clientSearch, form.clientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        clientId: form.clientId || undefined,
        companyId: form.companyId || undefined,
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        stage: form.stage,
        ownerId: canAssignOwner && form.ownerId ? form.ownerId : undefined,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (isEdit) {
        await api.patch(`/deals/${deal.id}`, payload);
      } else {
        await api.post('/deals', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el negocio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este negocio?')) return;
    await api.delete(`/deals/${deal.id}`);
    onDeleted();
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar negocio' : 'Nuevo negocio'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título *</label>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} placeholder="Ej. Venta de paquete anual" />
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-slate-700">Contacto</label>
            <input
              value={form.clientSearch}
              onChange={(e) => { update('clientSearch', e.target.value); update('clientId', ''); }}
              className={inputCls}
              placeholder="Buscar contacto..."
            />
            {clientOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {clientOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { update('clientId', c.id); update('clientSearch', c.fullName); setClientOptions([]); }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {c.fullName} <span className="text-xs text-slate-400">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Empresa</label>
              <select value={form.companyId} onChange={(e) => update('companyId', e.target.value)} className={inputCls}>
                <option value="">Sin empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Monto</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Etapa</label>
              <select value={form.stage} onChange={(e) => update('stage', e.target.value)} className={inputCls}>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cierre estimado</label>
              <input type="date" value={form.expectedCloseDate} onChange={(e) => update('expectedCloseDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          {canAssignOwner && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dueño</label>
              <select value={form.ownerId} onChange={(e) => update('ownerId', e.target.value)} className={inputCls}>
                <option value="">Sin asignar</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className={inputCls} />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:underline">
                Eliminar
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
