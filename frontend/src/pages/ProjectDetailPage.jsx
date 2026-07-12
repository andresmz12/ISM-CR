import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ProjectBoard from '../components/ProjectBoard';
import TaskModal from '../components/TaskModal';
import ProjectMembersModal from '../components/ProjectMembersModal';
import KanbanBoard from '../components/KanbanBoard';
import NewClientModal from '../components/NewClientModal';
import ImportClientsModal from '../components/ImportClientsModal';
import QuickNoteModal from '../components/QuickNoteModal';
import StatusBadge, { colorForStatus } from '../components/StatusBadge';
import CopyableId from '../components/CopyableId';
import ColumnPicker, { useColumnPrefs } from '../components/ColumnPicker';
import StatusVisibilityPicker, { useHiddenStatusIds } from '../components/StatusVisibilityPicker';
import Icon, { Avatar } from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const CLIENT_COLUMN_STORAGE_KEY = 'ism-crm-project-clients-columns';

const CLIENT_COLUMN_DEFS = [
  { key: 'listas', label: 'Listas' },
  { key: 'contacto', label: 'Contacto', required: true },
  { key: 'estatus', label: 'Estatus', required: true },
  { key: 'agente', label: 'Agente' },
  { key: 'seguimiento', label: 'Próximo seguimiento' },
  { key: 'nota', label: 'Última nota' },
  { key: 'email', label: 'Email', default: false },
  { key: 'direccion', label: 'Dirección', default: false },
  { key: 'origen', label: 'Origen', default: false },
  { key: 'etiquetas', label: 'Etiquetas', default: false },
];

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'clients', label: 'Clientes', icon: 'clients' },
  { key: 'lists', label: 'Listas', icon: 'folder' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar' },
  { key: 'tasks', label: 'Tareas', icon: 'tasks' },
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

// Contenido + estilo de cada celda, según la columna. Fuera del componente porque
// no depende de estado local, solo de los handlers/datos que se le pasan en `ctx`.
function clientColumnCell(key, c, lastNote, ctx) {
  switch (key) {
    case 'listas':
      return {
        className: 'px-5 py-3',
        content: c.listItems?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {c.listItems.map((li) => (
              <span key={li.listId} className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {li.list.name}
              </span>
            ))}
          </div>
        ) : <span className="text-slate-300">—</span>,
      };
    case 'contacto':
      return {
        className: 'whitespace-nowrap px-5 py-3',
        content: (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Icon name="phone" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{c.phone}
          </div>
        ),
      };
    case 'estatus':
      return {
        className: 'px-5 py-3',
        content: (
          <select
            value={c.statusId}
            onChange={(e) => ctx.onStatusChange(c.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`cursor-pointer rounded-md border-0 py-1 pl-2.5 pr-6 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${colorForStatus(c.status?.name)}`}
          >
            {ctx.statuses.map((s) => <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.name}</option>)}
          </select>
        ),
      };
    case 'agente':
      return {
        className: 'px-5 py-3',
        content: ctx.canManageAgents ? (
          <select
            value={c.assignedAgent?.id ?? ''}
            onChange={(e) => ctx.onReassign(c.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer whitespace-nowrap rounded-md border border-transparent bg-transparent py-1 text-sm text-slate-600 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            <option value="">Sin asignar</option>
            {ctx.agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
          </select>
        ) : c.assignedAgent ? (
          <div className="flex items-center gap-2 whitespace-nowrap text-slate-600">
            <Avatar name={c.assignedAgent.fullName} className="h-6 w-6 text-[9px]" />
            {c.assignedAgent.fullName}
          </div>
        ) : <span className="text-slate-400">Sin asignar</span>,
      };
    case 'seguimiento':
      return {
        className: 'whitespace-nowrap px-5 py-3 text-slate-600',
        content: c.nextFollowUpAt ? (
          <span className={`inline-flex items-center gap-1.5 ${new Date(c.nextFollowUpAt) < new Date() ? 'font-medium text-rose-600' : ''}`}>
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {new Date(c.nextFollowUpAt).toLocaleDateString()}
          </span>
        ) : <span className="text-slate-300">—</span>,
      };
    case 'nota':
      return {
        className: 'max-w-[260px] px-5 py-3',
        content: (
          <button
            onClick={() => ctx.onAddNote(c)}
            title={lastNote ? `${lastNote.notes}\n\nClic para agregar otra nota` : 'Clic para agregar una nota'}
            className="block w-full rounded-md px-1.5 py-1 text-left transition hover:bg-orange-50"
          >
            {lastNote ? (
              <div>
                <p className="truncate text-slate-700">{lastNote.notes}</p>
                <p className="text-xs text-slate-400">
                  {lastNote.user?.fullName} · {new Date(lastNote.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : <span className="text-slate-300 hover:text-orange-600">+ Agregar nota</span>}
          </button>
        ),
      };
    case 'email':
      return {
        className: 'whitespace-nowrap px-5 py-3 text-slate-600',
        content: c.email ? (
          <div className="flex items-center gap-1.5">
            <Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="max-w-[200px] truncate">{c.email}</span>
          </div>
        ) : <span className="text-slate-300">—</span>,
      };
    case 'direccion':
      return {
        className: 'max-w-[220px] truncate px-5 py-3 text-slate-600',
        title: c.address,
        content: c.address || <span className="text-slate-300">—</span>,
      };
    case 'origen':
      return {
        className: 'whitespace-nowrap px-5 py-3 text-slate-600',
        content: c.source || <span className="text-slate-300">—</span>,
      };
    case 'etiquetas':
      return {
        className: 'px-5 py-3',
        content: (
          <div className="flex flex-wrap gap-1">
            {c.tags?.length > 0 ? c.tags.map((t) => (
              <span key={t} className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">#{t}</span>
            )) : <span className="text-slate-300">—</span>}
          </div>
        ),
      };
    default:
      return { className: 'px-5 py-3', content: null };
  }
}

function ClientsTable({ clients, statuses, agents, canManageAgents, visibleKeys, onStatusChange, onReassign, onAddNote, onDelete }) {
  const colCount = 2 + visibleKeys.length;
  const cellCtx = { statuses, agents, canManageAgents, onStatusChange, onReassign, onAddNote };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
              {visibleKeys.map((key) => (
                <th key={key} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {CLIENT_COLUMN_DEFS.find((c) => c.key === key)?.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => {
              const lastNote = c.interactions?.[0];
              return (
                <tr key={c.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <Link to={`/clients/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={c.fullName} className="h-9 w-9 shrink-0 text-xs" />
                      <div className="font-semibold text-slate-900 hover:text-orange-600">{c.fullName}</div>
                    </Link>
                  </td>
                  {visibleKeys.map((key) => {
                    const cell = clientColumnCell(key, c, lastNote, cellCtx);
                    return (
                      <td key={key} className={cell.className} title={cell.title}>
                        {cell.content}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onAddNote(c)}
                        title="Agregar nota"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
                      >
                        <Icon name="file" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        title="Eliminar contacto"
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
                  <p className="mt-2 text-sm text-slate-400">No hay contactos que coincidan.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientsTab({ projectId }) {
  const { user } = useAuth();
  const canManageAgents = user.role !== 'AGENT';
  const [view, setView] = useState('kanban');
  const [statuses, setStatuses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [lists, setLists] = useState([]);
  const [listFilter, setListFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [noteClient, setNoteClient] = useState(null);
  const { order: columnOrder, visibleKeys, toggle: toggleColumn, move: moveColumn } = useColumnPrefs(CLIENT_COLUMN_STORAGE_KEY, CLIENT_COLUMN_DEFS);
  const { hiddenStatusIds, toggle: toggleStatusVisible } = useHiddenStatusIds();
  // El filtro de Estatus aplica a Tablero y Tabla por igual: lo que se oculta en uno
  // desaparece del otro también, para que ambas vistas muestren el mismo subconjunto.
  const visibleClients = useMemo(
    () => clients.filter((c) => !hiddenStatusIds.has(c.statusId)),
    [clients, hiddenStatusIds]
  );

  const fetchClients = useCallback(() => {
    setLoading(true);
    const excludeStatusIds = hiddenStatusIds.size > 0 ? [...hiddenStatusIds].join(',') : undefined;
    return api.get('/clients', { params: { projectId, search: search || undefined, listId: listFilter || undefined, excludeStatusIds, pageSize: 200 } })
      .then((res) => setClients(res.data.items))
      .finally(() => setLoading(false));
  }, [projectId, search, listFilter, hiddenStatusIds]);

  const fetchLists = useCallback(() => {
    return api.get(`/projects/${projectId}/lists`).then((res) => setLists(res.data)).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    api.get('/statuses').then((res) => setStatuses(res.data));
    if (canManageAgents) {
      api.get('/users').then((res) => setAgents(res.data.filter((u) => u.active))).catch(() => {});
    }
  }, [canManageAgents]);
  useEffect(() => { fetchLists(); }, [fetchLists]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDropClient(clientId, newStatusId) {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, statusId: newStatusId } : c)));
    try {
      await api.patch(`/clients/${clientId}`, { statusId: newStatusId });
    } catch {
      fetchClients();
    }
  }

  async function handleReorderColumns(reordered) {
    const prevStatuses = statuses;
    setStatuses(reordered);
    try {
      await Promise.all(
        reordered
          .map((s, i) => (s.order !== i ? api.patch(`/statuses/${s.id}`, { order: i }) : null))
          .filter(Boolean)
      );
    } catch {
      setStatuses(prevStatuses);
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
      window.alert(err.response?.data?.error || 'No se pudo eliminar el contacto.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en esta empresa..."
              className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <select
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="">Todas las listas</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.clientCount})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm shadow-sm">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tablero
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tabla
            </button>
          </div>
          <StatusVisibilityPicker statuses={statuses} hiddenStatusIds={hiddenStatusIds} onToggle={toggleStatusVisible} />
          {view === 'table' && (
            <ColumnPicker columnDefs={CLIENT_COLUMN_DEFS} order={columnOrder} onToggle={toggleColumn} onMove={moveColumn} />
          )}
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
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          statuses={statuses}
          clients={visibleClients}
          onDropClient={handleDropClient}
          onReorderColumns={handleReorderColumns}
          canReorderColumns={user.role === 'ADMIN'}
          hiddenStatusIds={hiddenStatusIds}
        />
      ) : (
        <ClientsTable
          clients={visibleClients}
          statuses={statuses}
          agents={agents}
          canManageAgents={canManageAgents}
          visibleKeys={visibleKeys}
          onStatusChange={handleStatusChange}
          onReassign={handleReassign}
          onAddNote={setNoteClient}
          onDelete={handleDelete}
        />
      )}
      {showNewModal && (
        <NewClientModal
          statuses={statuses}
          agents={agents}
          lockedProjectId={projectId}
          onClose={() => setShowNewModal(false)}
          onCreated={() => fetchClients()}
        />
      )}
      {showImportModal && (
        <ImportClientsModal
          lockedProjectId={projectId}
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchClients(); fetchLists(); }}
        />
      )}
      {noteClient && (
        <QuickNoteModal
          client={noteClient}
          onClose={() => setNoteClient(null)}
          onSaved={() => { setNoteClient(null); fetchClients(); }}
        />
      )}
    </div>
  );
}

function ListsTab({ projectId }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchLists = useCallback(() => {
    setLoading(true);
    return api.get(`/projects/${projectId}/lists`).then((res) => setLists(res.data)).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/lists`, { name });
      setName('');
      fetchLists();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la lista.');
    } finally {
      setSaving(false);
    }
  }

  function startRename(list) {
    setRenamingId(list.id);
    setRenameValue(list.name);
  }

  async function handleRename(list) {
    if (!renameValue.trim() || renameValue === list.name) { setRenamingId(null); return; }
    try {
      await api.patch(`/projects/${projectId}/lists/${list.id}`, { name: renameValue.trim() });
      setRenamingId(null);
      fetchLists();
    } catch (err) {
      window.alert(err.response?.data?.error || 'No se pudo renombrar la lista.');
    }
  }

  async function handleDelete(list) {
    if (!window.confirm(`¿Eliminar la lista "${list.name}"? Los clientes no se eliminan, solo dejan de estar en esta lista.`)) return;
    await api.delete(`/projects/${projectId}/lists/${list.id}`);
    fetchLists();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Nueva lista</h2>
        <p className="mb-3 text-xs text-slate-500">
          Agrupá clientes de esta empresa. Un cliente puede estar en varias listas a la vez.
        </p>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleCreate} className="flex items-end gap-3">
          <div className="min-w-56 flex-1">
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la lista" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="rounded-md bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear lista'}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Nombre</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Clientes</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr>
            ) : lists.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {renamingId === l.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(l)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(l); if (e.key === 'Escape') setRenamingId(null); }}
                      className="rounded-md border border-orange-400 px-2 py-1 text-sm focus:outline-none"
                    />
                  ) : l.name}
                </td>
                <td className="px-4 py-2 text-slate-600">{l.clientCount}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => startRename(l)} className="text-xs font-medium text-slate-600 hover:underline">
                      Renombrar
                    </button>
                    <button onClick={() => handleDelete(l)} className="text-xs font-medium text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && lists.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Sin listas creadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgendaTab({ projectId }) {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = { projectId };
    Promise.all([
      api.get('/clients/tasks/today', { params }),
      api.get('/clients/tasks/overdue', { params }),
    ])
      .then(([t, o]) => { setToday(t.data); setOverdue(o.data); })
      .finally(() => setLoading(false));
  }, [projectId]);

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

function DashboardTab({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary', { params: { projectId } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [projectId]);

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
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Clientes por estatus</h2>
        <BarList
          items={data.byStatus.map((s) => ({ key: s.statusId, label: s.statusName ?? '—', count: s.count }))}
          emptyText="Sin clientes todavía."
        />
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [taskModal, setTaskModal] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [zyraOrgIdInput, setZyraOrgIdInput] = useState('');
  const [savingZyraOrgId, setSavingZyraOrgId] = useState(false);

  const fetchProject = useCallback(() => {
    setLoading(true);
    return api.get(`/projects/${id}`).then((res) => {
      setProject(res.data);
      setZyraOrgIdInput(res.data.zyraOrganizationId ?? '');
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function handleSaveZyraOrgId() {
    setSavingZyraOrgId(true);
    try {
      await api.patch(`/projects/${id}`, { zyraOrganizationId: zyraOrgIdInput.trim() });
      fetchProject();
    } finally {
      setSavingZyraOrgId(false);
    }
  }

  const sections = project?.sections.map(({ tasks: _tasks, ...s }) => s) ?? [];
  const tasks = project?.sections.flatMap((s) => s.tasks) ?? [];

  async function handleDropTask(taskId, sectionId) {
    setProject((prev) => {
      let movedTask = null;
      const withoutTask = prev.sections.map((s) => {
        const found = s.tasks.find((t) => t.id === taskId);
        if (found) movedTask = { ...found, sectionId };
        return { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) };
      });
      return {
        ...prev,
        sections: withoutTask.map((s) => (s.id === sectionId && movedTask ? { ...s, tasks: [...s.tasks, movedTask] } : s)),
      };
    });
    try {
      await api.patch(`/projects/${id}/tasks/${taskId}`, { sectionId });
    } catch {
      fetchProject();
    }
  }

  async function handleAddSection() {
    const name = window.prompt('Nombre de la nueva sección:');
    if (!name?.trim()) return;
    await api.post(`/projects/${id}/sections`, { name: name.trim() });
    fetchProject();
  }

  async function handleRenameSection(section, newName) {
    await api.patch(`/projects/${id}/sections/${section.id}`, { name: newName });
    fetchProject();
  }

  async function handleDeleteSection(section) {
    if (!window.confirm(`¿Eliminar la sección "${section.name}"? Se eliminarán también sus tareas.`)) return;
    await api.delete(`/projects/${id}/sections/${section.id}`);
    fetchProject();
  }

  async function handleDeleteProject() {
    if (!window.confirm(`¿Eliminar la empresa "${project.name}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/projects/${id}`);
    navigate('/projects');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!project) return <p className="text-slate-500">Empresa no encontrada.</p>;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a empresas
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Icon name="building" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              {user.role === 'ADMIN' && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <CopyableId id={project.id} label="ID del proyecto" />
                  <div className="flex items-center gap-1.5">
                    <input
                      value={zyraOrgIdInput}
                      onChange={(e) => setZyraOrgIdInput(e.target.value)}
                      placeholder="organization_id de ZyraVoice"
                      title="Mapea el organization_id que ZyraVoice manda en sus webhooks a esta empresa, para que /integrations/emails no mezcle clientes entre empresas"
                      className="w-48 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 focus:border-orange-400 focus:outline-none"
                    />
                    {zyraOrgIdInput !== (project.zyraOrganizationId ?? '') && (
                      <button
                        onClick={handleSaveZyraOrgId}
                        disabled={savingZyraOrgId}
                        className="rounded-md bg-orange-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        {savingZyraOrgId ? 'Guardando...' : 'Guardar'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {project.description && <p className="mt-2 text-sm text-slate-500">{project.description}</p>}
              <p className="mt-1 text-sm text-slate-500">{project._count?.clients ?? 0} clientes</p>
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600">
                  <Icon name="link" className="h-3.5 w-3.5" />{project.repoUrl}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex -space-x-2">
              {project.members.map((m) => (
                <Avatar key={m.user.id} name={m.user.fullName} className="h-8 w-8 border-2 border-white text-[10px]" />
              ))}
            </div>
            {project.isPrivileged && (
              <div className="flex gap-2">
                <button onClick={() => setShowMembersModal(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Gestionar equipo
                </button>
                <button onClick={handleDeleteProject} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
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

      {tab === 'tasks' && (
        <ProjectBoard
          sections={sections}
          tasks={tasks}
          canManageSections
          onOpenTask={(task) => setTaskModal({ task, sectionId: task.sectionId })}
          onAddTask={(sectionId) => setTaskModal({ task: null, sectionId })}
          onDropTask={handleDropTask}
          onAddSection={handleAddSection}
          onRenameSection={handleRenameSection}
          onDeleteSection={handleDeleteSection}
        />
      )}
      {tab === 'clients' && <ClientsTab projectId={id} />}
      {tab === 'lists' && <ListsTab projectId={id} />}
      {tab === 'agenda' && <AgendaTab projectId={id} />}
      {tab === 'dashboard' && <DashboardTab projectId={id} />}

      {taskModal && (
        <TaskModal
          task={taskModal.task}
          projectId={id}
          sections={project.sections}
          members={project.members}
          defaultSectionId={taskModal.sectionId}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); fetchProject(); }}
          onDeleted={() => { setTaskModal(null); fetchProject(); }}
        />
      )}

      {showMembersModal && (
        <ProjectMembersModal
          projectId={id}
          members={project.members}
          onClose={() => setShowMembersModal(false)}
          onChanged={fetchProject}
        />
      )}
    </div>
  );
}
