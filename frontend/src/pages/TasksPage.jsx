import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

function ClientTaskList({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Sin pendientes.</p>;
  return (
    <div className="divide-y divide-gray-100">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-3">
          <div>
            <Link to={`/clients/${c.id}`} className="font-medium text-indigo-600 hover:underline">{c.fullName}</Link>
            <div className="text-sm text-gray-500">{c.phone}</div>
          </div>
          <div className="flex items-center gap-3 text-right text-sm text-gray-500">
            <StatusBadge name={c.status?.name} />
            <span>{c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleString() : '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/clients/tasks/today'),
      api.get('/clients/tasks/overdue'),
    ])
      .then(([t, o]) => { setToday(t.data); setOverdue(o.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Tareas del día</h1>

      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-red-800">Seguimientos vencidos ({overdue.length})</h2>
          <ClientTaskList items={overdue} />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Para contactar hoy ({today.length})</h2>
        <ClientTaskList items={today} />
      </div>
    </div>
  );
}
