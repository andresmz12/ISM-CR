import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Icon, { Avatar } from '../components/Icon';

const INTERACTION_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'SMS', 'VISIT', 'OTHER'];

export default function ClientDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'CALL', notes: '', resultStatusId: '', nextFollowUpAt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  const canReassign = user.role === 'ADMIN' || user.role === 'SUPERVISOR';

  const fetchClient = useCallback(() => {
    setLoading(true);
    return api.get(`/clients/${id}`).then((res) => setClient(res.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useEffect(() => {
    api.get('/statuses').then((res) => setStatuses(res.data));
    if (canReassign) api.get('/users').then((res) => setAgents(res.data.filter((u) => u.active))).catch(() => {});
  }, [canReassign]);

  async function handleLogInteraction(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/clients/${id}/interactions`, {
        type: form.type,
        notes: form.notes,
        resultStatusId: form.resultStatusId || undefined,
        nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined,
      });
      setForm({ type: 'CALL', notes: '', resultStatusId: '', nextFollowUpAt: '' });
      fetchClient();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la interacción.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReassign() {
    if (!reassignTo) return;
    await api.post(`/clients/${id}/reassign`, { agentId: reassignTo });
    setReassignTo('');
    fetchClient();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!client) return <p className="text-slate-500">Cliente no encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a clientes
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <Avatar name={client.fullName} className="h-12 w-12 text-sm" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{client.fullName}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Icon name="phone" className="h-3.5 w-3.5 text-slate-400" />{client.phone}</span>
                {client.phoneAlt && <span>{client.phoneAlt}</span>}
                {client.email && <span className="flex items-center gap-1.5"><Icon name="mail" className="h-3.5 w-3.5 text-slate-400" />{client.email}</span>}
              </div>
              {client.address && <p className="mt-1 text-sm text-slate-500">{client.address}</p>}
              {client.company && (
                <Link to={`/companies/${client.company.id}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600">
                  <Icon name="building" className="h-3.5 w-3.5" />{client.company.name}
                </Link>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge name={client.status?.name} />
                {client.source && <span className="text-xs text-slate-400">Origen: {client.source}</span>}
                {client.tags?.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">#{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Agente: <span className="font-medium text-slate-700">{client.assignedAgent?.fullName ?? 'Sin asignar'}</span></div>
            {client.nextFollowUpAt && (
              <div>Próximo seguimiento: {new Date(client.nextFollowUpAt).toLocaleString()}</div>
            )}
            {canReassign && (
              <div className="mt-2 flex items-center gap-2">
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                  <option value="">Reasignar a...</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                </select>
                <button onClick={handleReassign} disabled={!reassignTo}
                  className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-40">
                  Asignar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Registrar interacción</h2>
          {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleLogInteraction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nuevo estatus</label>
                <select value={form.resultStatusId} onChange={(e) => setForm((f) => ({ ...f, resultStatusId: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">(sin cambio)</option>
                  {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notas *</label>
              <textarea required rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="¿Qué se habló con el cliente?" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Próximo seguimiento</label>
              <input type="datetime-local" value={form.nextFollowUpAt}
                onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Historial de interacciones</h2>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {client.interactions.map((i) => (
              <div key={i.id} className="border-b border-slate-100 pb-2 text-sm last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{i.type}</span>
                  <span className="text-xs text-slate-400">{new Date(i.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600">{i.notes}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{i.user.fullName}</span>
                  {i.resultStatus && <StatusBadge name={i.resultStatus.name} />}
                </div>
              </div>
            ))}
            {client.interactions.length === 0 && <p className="text-sm text-slate-400">Sin interacciones registradas.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
