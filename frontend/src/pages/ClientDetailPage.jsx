import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Icon, { Avatar } from '../components/Icon';

const INTERACTION_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'SMS', 'VISIT', 'OTHER'];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsCard({ clientId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const fetchAttachments = useCallback(() => {
    api.get(`/clients/${clientId}/attachments`).then((res) => setAttachments(res.data)).catch(() => {});
  }, [clientId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      await api.post(`/clients/${clientId}/attachments`, data);
      fetchAttachments();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo subir el archivo (máx. 5 MB).');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // La descarga necesita el header Authorization, así que va por axios como blob.
  async function handleDownload(a) {
    const res = await api.get(`/clients/${clientId}/attachments/${a.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(a) {
    if (!window.confirm(`¿Eliminar "${a.fileName}"?`)) return;
    await api.delete(`/clients/${clientId}/attachments/${a.id}`);
    fetchAttachments();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="paperclip" className="h-4 w-4 text-slate-400" />
          Archivos ({attachments.length})
        </h2>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Icon name="upload" className="h-3.5 w-3.5" />
          {uploading ? 'Subiendo...' : 'Subir archivo'}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="divide-y divide-slate-100">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <button onClick={() => handleDownload(a)} className="block max-w-full truncate font-medium text-slate-800 hover:text-orange-600">
                {a.fileName}
              </button>
              <p className="text-xs text-slate-400">
                {formatSize(a.size)}{a.uploadedBy ? ` · ${a.uploadedBy.fullName}` : ''} · {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => handleDownload(a)} title="Descargar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Icon name="download" className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(a)} title="Eliminar" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {attachments.length === 0 && <p className="py-3 text-sm text-slate-400">Sin archivos adjuntos.</p>}
      </div>
    </div>
  );
}

// La nota de pickupRequestController.js empieza con "[RECOGIDA-PAQ] {event} —
// tracking {trackingCode}, estatus ...": se extrae el tracking code de ahí,
// no hay un campo estructurado para eso (un cliente puede tener varias
// recogidas con tracking codes distintos a lo largo del tiempo).
function extractTrackingCode(interactions) {
  const latest = interactions?.find((i) => i.notes?.startsWith('[RECOGIDA-PAQ]'));
  const match = latest?.notes?.match(/tracking\s+(\S+),/);
  return match ? match[1] : null;
}

function ShipmentCard({ client }) {
  const trackingCode = extractTrackingCode(client.interactions);
  if (!client.recipientName && !client.recipientAddress && !trackingCode) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Icon name="briefcase" className="h-3.5 w-3.5" />
        Envío
      </h3>
      <div className="space-y-1.5 text-slate-700">
        {client.address && (
          <p><span className="font-medium text-slate-800">Dirección de recogida:</span> {client.address}</p>
        )}
        {(client.recipientName || client.recipientAddress) && (
          <p>
            <span className="font-medium text-slate-800">Destinatario:</span>{' '}
            {client.recipientName || 'Sin nombre'}{client.recipientAddress ? ` — ${client.recipientAddress}` : ''}
          </p>
        )}
        {trackingCode && (
          <p><span className="font-medium text-slate-800">Tracking:</span> {trackingCode}</p>
        )}
      </div>
    </div>
  );
}

function DuplicatesCard({ clientId, canMerge, onMerged }) {
  const [duplicates, setDuplicates] = useState([]);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    api.get(`/clients/${clientId}/duplicates`).then((res) => setDuplicates(res.data)).catch(() => {});
  }, [clientId]);

  async function handleMerge(dup) {
    if (!window.confirm(
      `¿Fusionar "${dup.fullName}" dentro de este contacto?\n\nSe moverán sus interacciones, deals y archivos aquí, y el registro duplicado se eliminará. Esta acción no se puede deshacer.`
    )) return;
    setMerging(true);
    try {
      await api.post(`/clients/${clientId}/merge`, { sourceId: dup.id });
      setDuplicates((prev) => prev.filter((d) => d.id !== dup.id));
      onMerged();
    } catch (err) {
      window.alert(err.response?.data?.error || 'No se pudo fusionar.');
    } finally {
      setMerging(false);
    }
  }

  if (duplicates.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <Icon name="alert" className="h-4 w-4" />
        Posibles duplicados ({duplicates.length}) — mismo teléfono
      </h2>
      <div className="divide-y divide-amber-100">
        {duplicates.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div>
              <Link to={`/clients/${d.id}`} className="font-medium text-slate-900 hover:text-orange-600">{d.fullName}</Link>
              <p className="text-xs text-slate-500">{d.phone}{d.assignedAgent ? ` · ${d.assignedAgent.fullName}` : ''}</p>
            </div>
            {canMerge && (
              <button onClick={() => handleMerge(d)} disabled={merging}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                Fusionar aquí
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  if (!client) return <p className="text-slate-500">Contacto no encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a contactos
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
              {client.address && !client.recipientName && !client.recipientAddress && (
                <p className="mt-1 text-sm text-slate-500">{client.address}</p>
              )}
              {client.company && (
                <Link to={`/companies/${client.company.id}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600">
                  <Icon name="building" className="h-3.5 w-3.5" />{client.company.name}
                </Link>
              )}
              {client.workspace && (
                <Link to={`/workspaces/${client.workspace.id}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600">
                  <Icon name="users" className="h-3.5 w-3.5" />{client.workspace.name}
                </Link>
              )}
              <ShipmentCard client={client} />
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

      <DuplicatesCard clientId={id} canMerge={canReassign} onMerged={fetchClient} />

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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="¿Qué se habló con el contacto?" />
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
                <p className="whitespace-pre-line text-slate-600">{i.notes}</p>
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

      <AttachmentsCard clientId={id} />
    </div>
  );
}
