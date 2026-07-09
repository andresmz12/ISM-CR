import { useState } from 'react';
import Icon, { Avatar } from './Icon';

const COLUMN_ACCENTS = ['bg-orange-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-slate-400'];

const STATUS_LABELS = { PENDING: 'Pendiente', IN_PROGRESS: 'En curso', DONE: 'Completado', BLOCKED: 'Bloqueado' };
const STATUS_COLORS = {
  PENDING: 'bg-sky-500 text-white', IN_PROGRESS: 'bg-amber-500 text-white',
  DONE: 'bg-emerald-500 text-white', BLOCKED: 'bg-rose-500 text-white',
};
const PRIORITY_LABELS = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };
const PRIORITY_COLORS = { LOW: 'bg-slate-400 text-white', MEDIUM: 'bg-violet-500 text-white', HIGH: 'bg-rose-600 text-white' };

export default function ProjectBoard({ sections, tasks, canManageSections, onOpenTask, onAddTask, onDropTask, onAddSection, onRenameSection, onDeleteSection }) {
  const [dragId, setDragId] = useState(null);
  const [overSection, setOverSection] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionDraft, setSectionDraft] = useState('');

  const columns = sections.map((section) => ({
    section,
    tasks: tasks.filter((t) => t.sectionId === section.id),
  }));

  function startRename(section) {
    setEditingSection(section.id);
    setSectionDraft(section.name);
  }

  function commitRename(section) {
    if (sectionDraft.trim() && sectionDraft !== section.name) onRenameSection(section, sectionDraft.trim());
    setEditingSection(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ section, tasks: columnTasks }, i) => (
        <div
          key={section.id}
          onDragOver={(e) => { e.preventDefault(); setOverSection(section.id); }}
          onDragLeave={() => setOverSection((s) => (s === section.id ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onDropTask(dragId, section.id);
            setOverSection(null);
            setDragId(null);
          }}
          className={`flex w-72 shrink-0 flex-col rounded-2xl border transition ${
            overSection === section.id ? 'border-orange-400 bg-orange-50/70 ring-2 ring-orange-200' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="px-3 pt-3">
            <div className={`h-1 rounded-full ${COLUMN_ACCENTS[i % COLUMN_ACCENTS.length]}`} />
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            {editingSection === section.id ? (
              <input
                autoFocus
                value={sectionDraft}
                onChange={(e) => setSectionDraft(e.target.value)}
                onBlur={() => commitRename(section)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(section); if (e.key === 'Escape') setEditingSection(null); }}
                className="w-full rounded border border-orange-300 bg-white px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none"
              />
            ) : (
              <span
                onClick={() => canManageSections && startRename(section)}
                className={`truncate text-sm font-semibold text-slate-800 ${canManageSections ? 'cursor-text hover:text-orange-600' : ''}`}
              >
                {section.name}
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">{columnTasks.length}</span>
              {canManageSections && (
                <button onClick={() => onDeleteSection(section)} className="text-slate-300 hover:text-red-500">
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-2 px-3 pb-3">
            {columnTasks.map((task) => {
              const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onClick={() => onOpenTask(task)}
                  className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    dragId === task.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    {task.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Avatar name={task.assignee.fullName} className="h-5 w-5 text-[8px]" />
                        {task.assignee.fullName}
                      </span>
                    ) : <span />}
                    {task.dueDate && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${overdue ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'}`}>
                        <Icon name="calendar" className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => onAddTask(section.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-400 transition hover:border-orange-300 hover:text-orange-600"
            >
              <Icon name="plus" className="h-3.5 w-3.5" /> Agregar tarea
            </button>
          </div>
        </div>
      ))}

      {canManageSections && (
        <button
          onClick={onAddSection}
          className="flex h-12 w-56 shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl border border-dashed border-slate-300 text-sm font-medium text-slate-400 transition hover:border-orange-300 hover:text-orange-600"
        >
          <Icon name="plus" className="h-4 w-4" /> Agregar sección
        </button>
      )}
    </div>
  );
}
