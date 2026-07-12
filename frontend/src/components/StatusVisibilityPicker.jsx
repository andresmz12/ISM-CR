import { useState } from 'react';
import Icon from './Icon';

// Estatus ocultos del Tablero/Tabla de una empresa: preferencia guardada en el
// proyecto (compartida por todo el equipo, sigue a cada usuario sin importar el
// dispositivo), no borra ni desactiva el estatus — sigue disponible en Admin y en
// el selector de Estatus de cada cliente. El estado vive en el componente padre
// (ligado al proyecto); este componente solo dibuja el picker.
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
            Estatus visibles del equipo (Tablero y Tabla)
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
