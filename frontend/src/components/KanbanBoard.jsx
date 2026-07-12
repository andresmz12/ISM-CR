import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { Avatar } from './Icon';
import ColumnPicker, { useColumnPrefs } from './ColumnPicker';

const COLUMN_ACCENTS = [
  'bg-sky-400', 'bg-orange-400', 'bg-violet-400', 'bg-amber-400',
  'bg-rose-400', 'bg-emerald-400', 'bg-slate-400',
];

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
  const { visibleKeys: cardFields, order: cardFieldOrder, toggle: toggleCardField, move: moveCardField } =
    useColumnPrefs(CARD_FIELD_STORAGE_KEY, CARD_FIELD_DEFS);

  const columns = statuses.map((status, i) => ({
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
      <div className="flex items-center justify-end">
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
