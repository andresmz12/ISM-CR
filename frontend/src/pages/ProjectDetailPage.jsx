import { useCallback, useEffect, useState } from 'react';
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
import Icon, { Avatar } from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'clients', label: 'Clientes', icon: 'clients' },
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

function ClientsTable({ clients, statuses, agents, canManageAgents, onStatusChange, onReassign, onAddNote, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estatus</th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Próximo seguimiento</th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Última nota</th>
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
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Icon name="phone" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{c.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={c.statusId}
                      onChange={(e) => onStatusChange(c.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`cursor-pointer rounded-md border-0 py-1 pl-2.5 pr-6 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${colorForStatus(c.status?.name)}`}
                    >
                      {statuses.map((s) => <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    {canManageAgents ? (
                      <select
                        value={c.assignedAgent?.id ?? ''}
                        onChange={(e) => onReassign(c.id, e.target.value)}
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
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                    {c.nextFollowUpAt ? (
                      <span className={`inline-flex items-center gap-1.5 ${new Date(c.nextFollowUpAt) < new Date() ? 'font-medium text-rose-600' : ''}`}>
                        <Icon name="calendar" className="h-3.5 w-3.5" />
                        {new Date(c.nextFollowUpAt).toLocaleDateString()}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
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
                <td colSpan={7} className="px-5 py-12 text-center">
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [noteClient, setNoteClient] = useState(null);

  const fetchClients = useCallback(() => {
    setLoading(true);
    return api.get('/clients', { params: { projectId, search: search || undefined, pageSize: 200 } })
      .then((res) => setClients(res.data.items))
      .finally(() => setLoading(false));
  }, [projectId, search]);

  useEffect(() => {
    api.get('/statuses').then((res) => setStatuses(res.data));
    if (canManageAgents) {
      api.get('/users').then((res) => setAgents(res.data.filter((u) => u.active))).catch(() => {});
    }
  }, [canManageAgents]);
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
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en esta empresa..."
            className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
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
        <KanbanBoard statuses={statuses} clients={clients} onDropClient={handleDropClient} />
      ) : (
        <ClientsTable
          clients={clients}
          statuses={statuses}
          agents={agents}
          canManageAgents={canManageAgents}
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
          onImported={() => fetchClients()}
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
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Pipeline por estatus</h2>
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

  const fetchProject = useCallback(() => {
    setLoading(true);
    return api.get(`/projects/${id}`).then((res) => setProject(res.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

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
                <div className="mt-1.5">
                  <CopyableId id={project.id} label="ID del proyecto" />
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
