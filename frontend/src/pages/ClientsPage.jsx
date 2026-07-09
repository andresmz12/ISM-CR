import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import KanbanBoard from '../components/KanbanBoard';
import NewClientModal from '../components/NewClientModal';

export default function ClientsPage() {
  const { user } = useAuth();
  const canFilterByAgent = user.role !== 'AGENT';

  const [view, setView] = useState('kanban');
  const [statuses, setStatuses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-300 bg-white p-0.5 text-sm">
            <button
              onClick={() => { setView('kanban'); setPage(1); }}
              className={`rounded px-3 py-1 ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => { setView('table'); setPage(1); }}
              className={`rounded px-3 py-1 ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
            >
              Tabla
            </button>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={statusId} onChange={(e) => { setStatusId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estatus</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {canFilterByAgent && (
          <select value={assignedAgentId} onChange={(e) => { setAssignedAgentId(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos los agentes</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : view === 'kanban' ? (
        <KanbanBoard statuses={statuses} clients={clients} onDropClient={handleDropClient} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Teléfono</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Estatus</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Agente</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Próximo seguimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/clients/${c.id}`} className="font-medium text-indigo-600 hover:underline">{c.fullName}</Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-2"><StatusBadge name={c.status?.name} /></td>
                  <td className="px-4 py-2 text-gray-600">{c.assignedAgent?.fullName ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin clientes.</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
            <span>{total} clientes</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewClientModal
          statuses={statuses}
          agents={agents}
          onClose={() => setShowNewModal(false)}
          onCreated={() => fetchClients()}
        />
      )}
    </div>
  );
}
