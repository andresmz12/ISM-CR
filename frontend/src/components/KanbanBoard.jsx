import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { Avatar } from './Icon';
import ColumnPicker, { useColumnPrefs } from './ColumnPicker';

const COLUMN_ACCENTS = [
  'bg-sky-400', 'bg-orange-400', 'bg-violet-400', 'bg-amber-400',
  'bg-rose-400', 'bg-emerald-400', 'bg-slate-400',
];

// Los estatus son globales (compartidos entre todas las empresas), así que ocultar
// una columna del tablero es una preferencia de pantalla por navegador, nunca borra
// ni desactiva el estatus — sigue disponible en el selector de Estatus de la tabla y
// en Admin. No usa useColumnPrefs porque `statuses` llega async del backend y el
// picker de estatus necesita reflejar la lista completa aunque llegue después del
// primer render (useColumnPrefs solo lee columnDefs una vez, al montar).
const HIDDEN_STATUS_STORAGE_KEY = 'ism-crm-kanban-hidden-statuses';

function loadHiddenStatusIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(HIDDEN_STATUS_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function StatusVisibilityPicker({ statuses, hiddenStatusIds, onToggle }) {
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
            Columnas visibles en este tablero
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

const CARD_FIELD_STORAGE_KEY = 'ism-crm-kanban-card-fields';

const CARD_FIELD_DEFS = [
  { key: 'agente', label: 'Agente en la tarjeta' },
  { key: 'seguimiento', label: 'Próximo seguimiento en la tarjeta' },
  { key: 'origen', label: 'Origen', default: false },
  { key: 'etiquetas', label: 'Etiquetas', default: false },
  { key: 'email', label: 'Email', default: false },
];

// El estatus de un cliente no tiene por qué coincidir con ningún campo estándar de
// contacto, así que las tarjetas siempre muestran nombre + teléfono (identidad mínima)
// y el resto son opcionales — ver CARD_FIELD_DEFS.
function CardFieldContent({ fieldKey, client }) {
  switch (fieldKey) {
    case 'agente':
      return client.assignedAgent ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {client.assignedAgent.fullName}
        </span>
      ) : null;
    case 'seguimiento':
      return client.nextFollowUpAt ? (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
          new Date(client.nextFollowUpAt) < new Date() ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'
        }`}>
          <Icon name="calendar" className="h-3 w-3" />
          {new Date(client.nextFollowUpAt).toLocaleDateString()}
        </span>
      ) : null;
    case 'origen':
      return client.source ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {client.source}
        </span>
      ) : null;
    case 'etiquetas':
      return client.tags?.length > 0 ? (
        <>
          {client.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">#{t}</span>
          ))}
        </>
      ) : null;
    case 'email':
      return client.email ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          <Icon name="mail" className="h-3 w-3" />{client.email}
        </span>
      ) : null;
    default:
      return null;
  }
}

export default function KanbanBoard({ statuses, clients, onDropClient, onReorderColumns, canReorderColumns = false }) {
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);
  const [dragColId, setDragColId] = useState(null);
  const [hiddenStatusIds, setHiddenStatusIds] = useState(loadHiddenStatusIds);
  const { visibleKeys: cardFields, order: cardFieldOrder, toggle: toggleCardField, move: moveCardField } =
    useColumnPrefs(CARD_FIELD_STORAGE_KEY, CARD_FIELD_DEFS);

  useEffect(() => {
    localStorage.setItem(HIDDEN_STATUS_STORAGE_KEY, JSON.stringify([...hiddenStatusIds]));
  }, [hiddenStatusIds]);

  function toggleStatusVisible(statusId) {
    setHiddenStatusIds((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId); else next.add(statusId);
      return next;
    });
  }

  const columns = statuses
    .filter((status) => !hiddenStatusIds.has(status.id))
    .map((status, i) => ({
      status,
      accent: COLUMN_ACCENTS[i % COLUMN_ACCENTS.length],
      items: clients.filter((c) => c.statusId === status.id),
    }));

  function handleColumnDrop(targetStatusId) {
    if (dragColId && dragColId !== targetStatusId) {
      const from = statuses.findIndex((s) => s.id === dragColId);
      const to = statuses.findIndex((s) => s.id === targetStatusId);
      if (from >= 0 && to >= 0) {
        const reordered = [...statuses];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        onReorderColumns?.(reordered);
      }
    } else if (dragId) {
      onDropClient(dragId, targetStatusId);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <StatusVisibilityPicker statuses={statuses} hiddenStatusIds={hiddenStatusIds} onToggle={toggleStatusVisible} />
        <ColumnPicker columnDefs={CARD_FIELD_DEFS} order={cardFieldOrder} onToggle={toggleCardField} onMove={moveCardField} />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ status, accent, items }) => (
          <div
            key={status.id}
            onDragOver={(e) => { e.preventDefault(); setOverStatus(status.id); }}
            onDragLeave={() => setOverStatus((s) => (s === status.id ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              handleColumnDrop(status.id);
              setOverStatus(null);
              setDragId(null);
              setDragColId(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border transition ${
              overStatus === status.id
                ? 'border-orange-400 bg-orange-50/70 ring-2 ring-orange-200'
                : 'border-slate-200 bg-slate-50/80'
            }`}
          >
            <div className="px-3 pt-3">
              <div className={`h-1 rounded-full ${accent}`} />
            </div>
            <div
              draggable={canReorderColumns}
              onDragStart={() => setDragColId(status.id)}
              onDragEnd={() => setDragColId(null)}
              className={`flex items-center justify-between px-4 py-3 ${canReorderColumns ? 'cursor-move' : ''}`}
              title={canReorderColumns ? 'Arrastra para reordenar esta columna' : undefined}
            >
              <span className="text-sm font-semibold text-slate-800">{status.name}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">{items.length}</span>
            </div>
            <div className="flex-1 space-y-2 px-3 pb-3">
              {items.map((client) => (
                <div
                  key={client.id}
                  draggable
                  onDragStart={() => setDragId(client.id)}
                  className={`cursor-move rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    dragId === client.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={client.fullName} className="h-8 w-8 text-[10px]" />
                    <div className="min-w-0">
                      <Link to={`/clients/${client.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-orange-600">
                        {client.fullName}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Icon name="phone" className="h-3 w-3" />{client.phone}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {cardFields.map((key) => (
                      <CardFieldContent key={key} fieldKey={key} client={client} />
                    ))}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                  Arrastra contactos aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
