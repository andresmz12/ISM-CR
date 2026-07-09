import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import { colorForStatus } from '../components/StatusBadge';
import NewClientModal from '../components/NewClientModal';
import ImportClientsModal from '../components/ImportClientsModal';
import QuickNoteModal from '../components/QuickNoteModal';
import Icon, { Avatar } from '../components/Icon';

const STORAGE_KEY = 'ism-crm-clients-columns';

const OPTIONAL_COLUMNS = [
  { key: 'contacto', label: 'Contacto', default: true },
  { key: 'agente', label: 'Agente', default: true },
  { key: 'seguimiento', label: 'Próximo seguimiento', default: true },
  { key: 'nota', label: 'Última nota', default: true },
  { key: 'empresa', label: 'Empresa', default: false },
  { key: 'direccion', label: 'Dirección', default: false },
  { key: 'origen', label: 'Origen', default: false },
  { key: 'etiquetas', label: 'Etiquetas', default: false },
];

function loadColumnPrefs() {
  const defaults = Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.key, c.default]));
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

function ColumnPicker({ visible, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Icon name="settings" className="h-4 w-4" />
        Columnas
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
          <p className="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mostrar columnas</p>
          {OPTIONAL_COLUMNS.map((col) => (
            <label
              key={col.key}
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center gap-2.5 px-3.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input type="checkbox" checked={!!visible[col.key]} onChange={() => onToggle(col.key)} />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [noteClient, setNoteClient] = useState(null);
  const [flashMessage, setFlashMessage] = useState('');
  const [visibleCols, setVisibleCols] = useState(loadColumnPrefs);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (location.state?.openNew) navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  function toggleColumn(key) {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(''), 3500);
    return () => clearTimeout(t);
  }, [flashMessage]);

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

  async function handleDelete(client) {
    if (!window.confirm(`¿Eliminar a "${client.fullName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      fetchClients();
    } catch (err) {
      window.alert(err.response?.data?.error || 'No se pudo eliminar el cliente.');
    }
  }

  function scrollTable(amount) {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  const colCount = 3 + OPTIONAL_COLUMNS.filter((c) => visibleCols[c.key]).length;

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
              Tablero
            </button>
            <button
              onClick={() => { setView('table'); setPage(1); }}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tabla
            </button>
          </div>
          {view === 'table' && <ColumnPicker visible={visibleCols} onToggle={toggleColumn} />}
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

      {flashMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <Icon name="check" className="h-4 w-4" />
          {flashMessage}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard statuses={statuses} clients={clients} onDropClient={handleDropClient} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="px-2 text-xs text-slate-400">Desliza o usa las flechas para ver más columnas →</span>
            <div className="flex gap-1">
              <button onClick={() => scrollTable(-320)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button onClick={() => scrollTable(320)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                  {visibleCols.contacto && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>}
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estatus</th>
                  {visibleCols.agente && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>}
                  {visibleCols.seguimiento && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Próximo seguimiento</th>}
                  {visibleCols.nota && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Última nota</th>}
                  {visibleCols.empresa && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>}
                  {visibleCols.direccion && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dirección</th>}
                  {visibleCols.origen && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Origen</th>}
                  {visibleCols.etiquetas && <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etiquetas</th>}
                  <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => {
                  const emails = c.email ? c.email.split(',').map((e) => e.trim()).filter(Boolean) : [];
                  const lastNote = c.interactions?.[0];
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link to={`/clients/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.fullName} className="h-9 w-9 shrink-0 text-xs" />
                          <div>
                            <div className="font-semibold text-slate-900 hover:text-orange-600">{c.fullName}</div>
                            {c.source && !visibleCols.origen && <div className="text-xs text-slate-400">{c.source}</div>}
                          </div>
                        </Link>
                      </td>
                      {visibleCols.contacto && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-slate-600">
                            <Icon name="phone" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{c.phone}
                          </div>
                          {emails.length > 0 && (
                            <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400" title={emails.join(', ')}>
                              <Icon name="mail" className="h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-[160px] truncate">{emails[0]}</span>
                              {emails.length > 1 && (
                                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  +{emails.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <select
                          value={c.statusId}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`cursor-pointer rounded-md border-0 py-1 pl-2.5 pr-6 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${colorForStatus(c.status?.name)}`}
                        >
                          {statuses.map((s) => <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.name}</option>)}
                        </select>
                      </td>
                      {visibleCols.agente && (
                        <td className="px-5 py-3">
                          {canFilterByAgent ? (
                            <select
                              value={c.assignedAgent?.id ?? ''}
                              onChange={(e) => handleReassign(c.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-pointer whitespace-nowrap rounded-md border border-transparent bg-transparent py-1 text-sm text-slate-600 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            >
                              <option value="">Sin asignar</option>
                              {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                            </select>
                          ) : c.assignedAgent ? (
                            <div className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                              <Avatar name={c.assignedAgent.fullName} className="h-6 w-6 text-[9px]" />
                              {c.assignedAgent.fullName}
                            </div>
                          ) : <span className="text-slate-400">Sin asignar</span>}
                        </td>
                      )}
                      {visibleCols.seguimiento && (
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {c.nextFollowUpAt ? (
                            <span className={`inline-flex items-center gap-1.5 ${new Date(c.nextFollowUpAt) < new Date() ? 'font-medium text-rose-600' : ''}`}>
                              <Icon name="calendar" className="h-3.5 w-3.5" />
                              {new Date(c.nextFollowUpAt).toLocaleDateString()}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      {visibleCols.nota && (
                        <td className="max-w-[260px] px-5 py-3">
                          {lastNote ? (
                            <div title={lastNote.notes}>
                              <p className="truncate text-slate-700">{lastNote.notes}</p>
                              <p className="text-xs text-slate-400">
                                {lastNote.user?.fullName} · {new Date(lastNote.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ) : <span className="text-slate-300">Sin notas</span>}
                        </td>
                      )}
                      {visibleCols.empresa && (
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {c.company ? (
                            <Link to={`/companies/${c.company.id}`} className="hover:text-orange-600" onClick={(e) => e.stopPropagation()}>
                              {c.company.name}
                            </Link>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      {visibleCols.direccion && (
                        <td className="max-w-[220px] truncate px-5 py-3 text-slate-600" title={c.address}>
                          {c.address || <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      {visibleCols.origen && (
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{c.source || <span className="text-slate-300">—</span>}</td>
                      )}
                      {visibleCols.etiquetas && (
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.tags?.length > 0 ? c.tags.map((t) => (
                              <span key={t} className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">#{t}</span>
                            )) : <span className="text-slate-300">—</span>}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setNoteClient(c)}
                            title="Agregar nota"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
                          >
                            <Icon name="file" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            title="Eliminar cliente"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-5 py-12 text-center">
                      <Icon name="clients" className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
                      <p className="mt-2 text-sm text-slate-400">No hay clientes que coincidan.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
      {noteClient && (
        <QuickNoteModal
          client={noteClient}
          onClose={() => setNoteClient(null)}
          onSaved={() => { setNoteClient(null); setFlashMessage(`Nota agregada a ${noteClient.fullName}.`); fetchClients(); }}
        />
      )}
    </div>
  );
}
