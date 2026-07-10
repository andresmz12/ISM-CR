import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import NewClientModal from '../components/NewClientModal';
import WorkspaceMembersModal from '../components/WorkspaceMembersModal';
import StatusBadge from '../components/StatusBadge';
import Icon, { Avatar } from '../components/Icon';

const TABS = [
  { key: 'clients', label: 'Clientes', icon: 'clients' },
  { key: 'agenda', label: 'Agenda', icon: 'tasks' },
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
];

function ClientTaskList({ items }) {
  if (items.length === 0) return <p className="py-4 text-sm text-slate-400">Sin pendientes.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Avatar name={c.fullName} className="h-9 w-9 text-xs" />
            <div>
              <Link to={`/clients/${c.id}`} className="font-semibold text-slate-900 hover:text-orange-600">{c.fullName}</Link>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon name="phone" className="h-3.5 w-3.5" />{c.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right text-sm text-slate-500">
            <StatusBadge name={c.status?.name} />
            <span>{c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleString() : '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BarList({ items, emptyText }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="py-4 text-sm text-slate-400">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-slate-500">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientsTab({ workspaceId }) {
  const [statuses, setStatuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchClients = useCallback(() => {
    setLoading(true);
    return api.get('/clients', { params: { workspaceId, pageSize: 200 } })
      .then((res) => setClients(res.data.items))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    api.get('/statuses').then((res) => setStatuses(res.data));
  }, []);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDropClient(clientId, newStatusId) {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, statusId: newStatusId } : c)));
    try {
      await api.patch(`/clients/${clientId}`, { statusId: newStatusId });
    } catch {
      fetchClients();
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>
      <KanbanBoard statuses={statuses} clients={clients} onDropClient={handleDropClient} />
      {showNewModal && (
        <NewClientModal
          statuses={statuses}
          agents={[]}
          workspaceId={workspaceId}
          onClose={() => setShowNewModal(false)}
          onCreated={() => fetchClients()}
        />
      )}
    </div>
  );
}

function AgendaTab({ workspaceId }) {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = { workspaceId };
    Promise.all([
      api.get('/clients/tasks/today', { params }),
      api.get('/clients/tasks/overdue', { params }),
    ])
      .then(([t, o]) => { setToday(t.data); setOverdue(o.data); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {overdue.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-red-800">Seguimientos vencidos ({overdue.length})</h2>
          <ClientTaskList items={overdue} />
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Para contactar hoy ({today.length})</h2>
        <ClientTaskList items={today} />
      </div>
    </div>
  );
}

function DashboardTab({ workspaceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary', { params: { workspaceId } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!data) return <p className="text-slate-500">No se pudo cargar el dashboard.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-sm font-medium text-slate-500">Total de clientes</div>
        <div className="text-3xl font-bold tracking-tight text-slate-900">{data.totalClients}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Pipeline por estatus</h2>
        <BarList
          items={data.byStatus.map((s) => ({ key: s.statusId, label: s.statusName ?? '—', count: s.count }))}
          emptyText="Sin clientes todavía."
        />
      </div>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('clients');
  const [showMembersModal, setShowMembersModal] = useState(false);

  const fetchWorkspace = useCallback(() => {
    setLoading(true);
    return api.get(`/workspaces/${id}`).then((res) => setWorkspace(res.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  async function handleDeleteWorkspace() {
    if (!window.confirm(`¿Eliminar la empresa "${workspace.name}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/workspaces/${id}`);
    navigate('/workspaces');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!workspace) return <p className="text-slate-500">Empresa no encontrada.</p>;

  return (
    <div className="space-y-6">
      <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a empresas
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Icon name="building" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{workspace.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{workspace._count.clients} clientes</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex -space-x-2">
              {workspace.members.map((m) => (
                <Avatar key={m.user.id} name={m.user.fullName} className="h-8 w-8 border-2 border-white text-[10px]" />
              ))}
            </div>
            {workspace.isPrivileged && (
              <div className="flex gap-2">
                <button onClick={() => setShowMembersModal(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Gestionar equipo
                </button>
                {user.role === 'ADMIN' && (
                  <button onClick={handleDeleteWorkspace} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'clients' && <ClientsTab workspaceId={id} />}
      {tab === 'agenda' && <AgendaTab workspaceId={id} />}
      {tab === 'dashboard' && <DashboardTab workspaceId={id} />}

      {showMembersModal && (
        <WorkspaceMembersModal
          workspaceId={id}
          members={workspace.members}
          onClose={() => setShowMembersModal(false)}
          onChanged={fetchWorkspace}
        />
      )}
    </div>
  );
}
