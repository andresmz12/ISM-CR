import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import NewClientModal from '../components/NewClientModal';
import ImportClientsModal from '../components/ImportClientsModal';
import Icon, { Avatar } from '../components/Icon';

export default function ClientsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canFilterByAgent = user.role !== 'AGENT';

  const [view, setView] = useState('table');
  const [statuses, setStatuses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(!!location.state?.openNew);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (location.state?.openNew) navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  const pageSize = view === 'kanban' ? 200 : 25;

  const fetchClients = useCallback(() => {
    setLoading(true);
    const params = { page, pageSize, search: search || undefined, statusId: statusId || undefined, assignedAgentId: assignedAgentId || undefined };
    return api.get('/clients', { params })
      .then((res) => { setClients(res.data.items); setTotal(res.data.total); })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, statusId, assignedAgentId]);

  useEffect(() => {
    api.get('/statuses').then((res) => setStatuses(res.data));
    api.get('/companies').then((res) => setCompanies(res.data)).catch(() => {});
    if (canFilterByAgent) {
      api.get('/users').then((res) => setAgents(res.data.filter((u) => u.active))).catch(() => {});
    }
  }, [canFilterByAgent]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDropClient(clientId, newStatusId) {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, statusId: newStatusId } : c)));
    try {
      await api.patch(`/clients/${clientId}`, { statusId: newStatusId });
    } catch {
      fetchClients();
    }
  }

  async function handleStatusChange(clientId, newStatusId) {
    const status = statuses.find((s) => s.id === newStatusId);
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, statusId: newStatusId, status } : c)));
    try {
      await api.patch(`/clients/${clientId}`, { statusId: newStatusId });
    } catch {
      fetchClients();
    }
  }

  async function handleReassign(clientId, agentId) {
    if (!agentId) return;
    const agent = agents.find((a) => a.id === agentId);
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, assignedAgent: agent ?? null } : c)));
    try {
      await api.post(`/clients/${clientId}/reassign`, { agentId });
    } catch {
      fetchClients();
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} clientes en total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm shadow-sm">
            <button
              onClick={() => { setView('kanban'); setPage(1); }}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => { setView('table'); setPage(1); }}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tabla
            </button>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Icon name="upload" className="h-4 w-4" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, teléfono o email..."
            className={`${inputCls} w-72 pl-9`}
          />
        </div>
        <select value={statusId} onChange={(e) => { setStatusId(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">Todos los estatus</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {canFilterByAgent && (
          <select value={assignedAgentId} onChange={(e) => { setAssignedAgentId(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">Todos los agentes</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard statuses={statuses} clients={clients} onDropClient={handleDropClient} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estatus</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Próximo seguimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <Link to={`/clients/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={c.fullName} className="h-9 w-9 text-xs" />
                      <div>
                        <div className="font-semibold text-slate-900 hover:text-orange-600">{c.fullName}</div>
                        {c.source && <div className="text-xs text-slate-400">{c.source}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Icon name="phone" className="h-3.5 w-3.5 text-slate-400" />{c.phone}
                    </div>
                    {c.email && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Icon name="mail" className="h-3.5 w-3.5" />{c.email}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={c.statusId}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer rounded-full border-0 bg-transparent py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    >
                      {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    {canFilterByAgent ? (
                      <select
                        value={c.assignedAgent?.id ?? ''}
                        onChange={(e) => handleReassign(c.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer rounded-md border border-transparent bg-transparent py-1 text-sm text-slate-600 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      >
                        <option value="">Sin asignar</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                      </select>
                    ) : c.assignedAgent ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Avatar name={c.assignedAgent.fullName} className="h-6 w-6 text-[9px]" />
                        {c.assignedAgent.fullName}
                      </div>
                    ) : <span className="text-slate-400">Sin asignar</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.nextFollowUpAt ? (
                      <span className={`inline-flex items-center gap-1.5 ${new Date(c.nextFollowUpAt) < new Date() ? 'font-medium text-rose-600' : ''}`}>
                        <Icon name="calendar" className="h-3.5 w-3.5" />
                        {new Date(c.nextFollowUpAt).toLocaleDateString()}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Icon name="clients" className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-slate-400">No hay clientes que coincidan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-sm text-slate-600">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-40">
                <Icon name="chevronLeft" className="h-4 w-4" /> Anterior
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-40">
                Siguiente <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewClientModal
          statuses={statuses}
          agents={agents}
          companies={companies}
          onClose={() => setShowNewModal(false)}
          onCreated={() => fetchClients()}
        />
      )}
      {showImportModal && (
        <ImportClientsModal
          onClose={() => setShowImportModal(false)}
          onImported={() => fetchClients()}
        />
      )}
    </div>
  );
}
