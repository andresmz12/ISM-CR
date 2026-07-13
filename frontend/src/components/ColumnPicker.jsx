import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import useClickOutside from '../hooks/useClickOutside';

// Preferencias de columnas: qué se ve y en qué orden, persistido por navegador/usuario.
// `columnDefs` es la lista completa posible; `required: true` fija una columna siempre visible
// (pero igual reordenable); `default: false` la oculta por defecto la primera vez.
export function useColumnPrefs(storageKey, columnDefs) {
  const [order, setOrder] = useState(() => {
    const fallback = columnDefs.map((c) => ({ key: c.key, visible: c.default !== false }));
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (!Array.isArray(stored)) return fallback;
      const seen = new Set(stored.map((s) => s.key));
      const merged = stored
        .filter((s) => columnDefs.some((c) => c.key === s.key))
        .map((s) => {
          const def = columnDefs.find((c) => c.key === s.key);
          return { key: s.key, visible: def.required ? true : !!s.visible };
        });
      columnDefs.forEach((c) => {
        if (!seen.has(c.key)) merged.push({ key: c.key, visible: c.default !== false });
      });
      return merged;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [storageKey, order]);

  function toggle(key) {
    const def = columnDefs.find((c) => c.key === key);
    if (def?.required) return;
    setOrder((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }

  function move(key, dir) {
    setOrder((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const visibleKeys = order.filter((c) => c.visible).map((c) => c.key);
  return { order, visibleKeys, toggle, move };
}

export default function ColumnPicker({ columnDefs, order, onToggle, onMove }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useClickOutside(rootRef, open, () => setOpen(false));
  const labelOf = (key) => columnDefs.find((c) => c.key === key)?.label ?? key;
  const requiredOf = (key) => !!columnDefs.find((c) => c.key === key)?.required;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Icon name="settings" className="h-4 w-4" />
        Columnas
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
          <p className="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Columnas y orden
          </p>
          {order.map((col, i) => (
            <div
              key={col.key}
              onClick={() => onToggle(col.key)}
              className="flex cursor-pointer items-center gap-2 px-3.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={col.visible}
                disabled={requiredOf(col.key)}
                onChange={() => onToggle(col.key)}
                onClick={(e) => e.stopPropagation()}
                className="disabled:opacity-40"
              />
              <span className="flex-1">{labelOf(col.key)}</span>
              <button
                type="button"
                disabled={i === 0}
                onClick={(e) => { e.stopPropagation(); onMove(col.key, -1); }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                title="Subir"
              >
                <Icon name="chevronLeft" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button
                type="button"
                disabled={i === order.length - 1}
                onClick={(e) => { e.stopPropagation(); onMove(col.key, 1); }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                title="Bajar"
              >
                <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-90" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
