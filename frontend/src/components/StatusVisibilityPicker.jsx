import { useEffect, useState } from 'react';
import Icon from './Icon';

// Los estatus son globales (compartidos entre todas las empresas), así que ocultar
// uno de la vista es una preferencia de pantalla por navegador — nunca borra ni
// desactiva el estatus, sigue disponible en el selector de Estatus de la tabla y en
// Admin. Se comparte entre Tablero y Tabla para que ambas vistas muestren lo mismo.
const STORAGE_KEY = 'ism-crm-kanban-hidden-statuses';

function loadHiddenStatusIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

export function useHiddenStatusIds() {
  const [hiddenStatusIds, setHiddenStatusIds] = useState(loadHiddenStatusIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenStatusIds]));
  }, [hiddenStatusIds]);

  function toggle(statusId) {
    setHiddenStatusIds((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId); else next.add(statusId);
      return next;
    });
  }

  return { hiddenStatusIds, toggle };
}

export default function StatusVisibilityPicker({ statuses, hiddenStatusIds, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Icon name="eye" className="h-4 w-4" />
        Estatus
        {hiddenStatusIds.size > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
            {statuses.length - hiddenStatusIds.size}/{statuses.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
          <p className="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Estatus visibles (Tablero y Tabla)
          </p>
          {statuses.map((s) => (
            <div
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onToggle(s.id)}
              className="flex cursor-pointer items-center gap-2.5 px-3.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={!hiddenStatusIds.has(s.id)}
                onChange={() => onToggle(s.id)}
                onClick={(e) => e.stopPropagation()}
              />
              {s.name}
            </div>
          ))}
          {statuses.length === 0 && (
            <p className="px-3.5 py-1.5 text-sm text-slate-400">Sin estatus configurados.</p>
          )}
        </div>
      )}
    </div>
  );
}
