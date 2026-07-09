import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    const res = await api.get('/dashboard/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'clientes.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!data) return <p className="text-gray-500">No se pudo cargar el dashboard.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={handleExport}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Total de clientes</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">{data.totalClients}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Interacciones registradas (recientes)</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">{data.recentInteractions.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Tipos de actividad</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.byInteractionType.map((t) => (
              <span key={t.type} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {t.type}: {t.count}
              </span>
            ))}
            {data.byInteractionType.length === 0 && <span className="text-xs text-gray-400">Sin datos aún</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Clientes por estatus</h2>
          <ul className="space-y-2">
            {data.byStatus.map((s) => (
              <li key={s.statusId} className="flex items-center justify-between text-sm">
                <StatusBadge name={s.statusName} />
                <span className="font-medium text-gray-700">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Clientes por agente</h2>
          <ul className="space-y-2">
            {data.byAgent.map((a) => (
              <li key={a.agentId ?? 'unassigned'} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{a.agentName}</span>
                <span className="font-medium text-gray-700">{a.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Actividad reciente</h2>
        <div className="divide-y divide-gray-100">
          {data.recentInteractions.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <Link to={`/clients/${i.client.id}`} className="font-medium text-indigo-600 hover:underline">
                  {i.client.fullName}
                </Link>
                <span className="ml-2 text-gray-400">{i.type}</span>
                <p className="text-gray-500">{i.notes}</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>{i.user.fullName}</div>
                <div>{new Date(i.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {data.recentInteractions.length === 0 && (
            <p className="py-4 text-sm text-gray-400">Sin actividad todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
