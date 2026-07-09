import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function KanbanBoard({ statuses, clients, onDropClient }) {
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);

  const columns = statuses.map((status) => ({
    status,
    items: clients.filter((c) => c.statusId === status.id),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ status, items }) => (
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
          className={`flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50 ${
            overStatus === status.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">{status.name}</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">{items.length}</span>
          </div>
          <div className="flex-1 space-y-2 p-2">
            {items.map((client) => (
              <div
                key={client.id}
                draggable
                onDragStart={() => setDragId(client.id)}
                className="cursor-move rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow"
              >
                <Link to={`/clients/${client.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                  {client.fullName}
                </Link>
                <div className="mt-1 text-xs text-gray-500">{client.phone}</div>
                {client.assignedAgent && (
                  <div className="mt-1 text-xs text-gray-400">{client.assignedAgent.fullName}</div>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-400">
                Sin clientes
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
