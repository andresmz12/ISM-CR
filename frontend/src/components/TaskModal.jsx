import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

const STATUSES = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'DONE', label: 'Completado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];

export default function TaskModal({ task, projectId, sections, members, defaultSectionId, onClose, onSaved, onDeleted }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title ?? '',
    sectionId: task?.sectionId ?? defaultSectionId ?? sections[0]?.id ?? '',
    status: task?.status ?? 'PENDING',
    priority: task?.priority ?? 'MEDIUM',
    assigneeId: task?.assignee?.id ?? '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    notes: task?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        sectionId: form.sectionId,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (isEdit) {
        await api.patch(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la tarea.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    await api.delete(`/projects/${projectId}/tasks/${task.id}`);
    onDeleted();
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título *</label>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sección</label>
            <select value={form.sectionId} onChange={(e) => update('sectionId', e.target.value)} className={inputCls}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputCls}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prioridad</label>
              <select value={form.priority} onChange={(e) => update('priority', e.target.value)} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
              <select value={form.assigneeId} onChange={(e) => update('assigneeId', e.target.value)} className={inputCls}>
                <option value="">Sin asignar</option>
                {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vencimiento</label>
              <input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className={inputCls} />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:underline">
                Eliminar
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
