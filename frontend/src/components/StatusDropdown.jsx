import { useRef, useState } from 'react';
import Icon from './Icon';
import { colorForStatus, statusPalette } from './StatusBadge';
import useClickOutside from '../hooks/useClickOutside';

// Reemplazo del <select> nativo para el estatus en tablas. El menú nativo lo
// dibuja el sistema operativo (en Mac con Modo Oscuro sale negro y Safari lo
// posiciona/estiliza a su manera), así que aquí se dibuja un menú propio que
// se ve igual en todos los navegadores y temas.
//
// El menú usa position:fixed calculado desde el botón porque la tabla vive en
// un contenedor con overflow-x-auto que recortaría un popover absoluto.
export default function StatusDropdown({ value, statuses, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, up: false });
  const rootRef = useRef(null);
  useClickOutside(rootRef, open, () => setOpen(false));

  const current = statuses.find((s) => s.id === value);

  function toggleOpen(e) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const estimatedHeight = Math.min(statuses.length, 9) * 34 + 12;
    const up = rect.bottom + estimatedHeight + 8 > window.innerHeight;
    setMenuPos({
      top: up ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 208),
      up,
    });
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggleOpen}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md py-1 pl-2.5 pr-2 text-xs font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${colorForStatus(current?.name)}`}
      >
        {current?.name ?? 'Sin estatus'}
        <Icon name="chevronDown" className="h-3 w-3 opacity-80" />
      </button>
      {open && (
        <div
          className="fixed z-40 max-h-72 w-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left, transform: menuPos.up ? 'translateY(-100%)' : undefined }}
        >
          {statuses.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (s.id !== value) onChange(s.id);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusPalette(s.name).dot}`} />
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === value && <Icon name="check" className="h-4 w-4 shrink-0 text-orange-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
