import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ProjectBoard from '../components/ProjectBoard';
import TaskModal from '../components/TaskModal';
import ProjectMembersModal from '../components/ProjectMembersModal';
import Icon, { Avatar } from '../components/Icon';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
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
    if (!window.confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return;
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
  if (!project) return <p className="text-slate-500">Proyecto no encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a proyectos
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Icon name="folder" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              {project.description && <p className="mt-1 text-sm text-slate-500">{project.description}</p>}
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
