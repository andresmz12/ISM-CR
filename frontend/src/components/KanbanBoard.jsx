import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { Avatar } from './Icon';

const COLUMN_ACCENTS = [
  'bg-sky-400', 'bg-orange-400', 'bg-violet-400', 'bg-amber-400',
  'bg-rose-400', 'bg-emerald-400', 'bg-slate-400',
];

export default function KanbanBoard({ statuses, clients, onDropClient }) {
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);

  const columns = statuses.map((status, i) => ({
    status,
    accent: COLUMN_ACCENTS[i % COLUMN_ACCENTS.length],
    items: clients.filter((c) => c.statusId === status.id),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ status, accent, items }) => (
        <div
          key={status.id}
          onDragOver={(e) => { e.preventDefault(); setOverStatus(status.id); }}
          onDragLeave={() => setOverStatus((s) => (s === status.id ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onDropClient(dragId, status.id);
            setOverStatus(null);
            setDragId(null);
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
          <div className="flex items-center justify-between px-4 py-3">
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
                  {client.assignedAgent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {client.assignedAgent.fullName}
                    </span>
                  )}
                  {client.nextFollowUpAt && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      new Date(client.nextFollowUpAt) < new Date()
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}>
                      <Icon name="calendar" className="h-3 w-3" />
                      {new Date(client.nextFollowUpAt).toLocaleDateString()}
                    </span>
                  )}
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
  );
}
