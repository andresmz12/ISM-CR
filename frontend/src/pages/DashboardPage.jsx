import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Icon, { Avatar } from '../components/Icon';

const TYPE_LABELS = { CALL: 'Llamada', EMAIL: 'Email', WHATSAPP: 'WhatsApp', SMS: 'SMS', VISIT: 'Visita', OTHER: 'Otro' };
const TYPE_ICONS = { CALL: 'phone', EMAIL: 'mail', WHATSAPP: 'phone', SMS: 'mail', VISIT: 'clients', OTHER: 'activity' };

const BAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function BarList({ items, emptyText }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="py-4 text-sm text-slate-400">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-slate-500">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, accent, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon name={icon} className="h-5 w-5" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState({ today: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/clients/tasks/today').catch(() => ({ data: [] })),
      api.get('/clients/tasks/overdue').catch(() => ({ data: [] })),
    ])
      .then(([summary, today, overdue]) => {
        setData(summary.data);
        setTasks({ today: today.data.length, overdue: overdue.data.length });
      })
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }
  if (!data) return <p className="text-slate-500">No se pudo cargar el dashboard.</p>;

  const totalInteractions = data.byInteractionType.reduce((acc, t) => acc + t.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Resumen general de tu operación comercial</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Icon name="download" className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="clients" label="Total de clientes" value={data.totalClients} accent="bg-indigo-50 text-indigo-600" />
        <StatCard icon="activity" label="Interacciones" value={totalInteractions} accent="bg-violet-50 text-violet-600" />
        <StatCard icon="calendar" label="Seguimientos hoy" value={tasks.today} accent="bg-sky-50 text-sky-600" />
        <StatCard icon="clock" label="Seguimientos vencidos" value={tasks.overdue} accent="bg-rose-50 text-rose-600" sub={tasks.overdue > 0 ? 'Requieren atención' : 'Todo al día'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="chart" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Pipeline por estatus</h2>
          </div>
          <BarList
            items={data.byStatus.map((s) => ({ key: s.statusId, label: s.statusName ?? '—', count: s.count }))}
            emptyText="Sin clientes todavía."
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="users" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Clientes por agente</h2>
          </div>
          <BarList
            items={data.byAgent.map((a) => ({ key: a.agentId ?? 'unassigned', label: a.agentName, count: a.count }))}
            emptyText="Sin clientes asignados."
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="activity" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Actividad por tipo</h2>
          </div>
          <BarList
            items={data.byInteractionType.map((t) => ({ key: t.type, label: TYPE_LABELS[t.type] ?? t.type, count: t.count }))}
            emptyText="Sin interacciones registradas."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          {data.recentInteractions.map((i) => (
            <div key={i.id} className="flex items-center gap-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon name={TYPE_ICONS[i.type] ?? 'activity'} className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Link to={`/clients/${i.client.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                    {i.client.fullName}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {TYPE_LABELS[i.type] ?? i.type}
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">{i.notes}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-right">
                <div>
                  <div className="text-xs font-medium text-slate-600">{i.user.fullName}</div>
                  <div className="text-[11px] text-slate-400">{new Date(i.createdAt).toLocaleString()}</div>
                </div>
                <Avatar name={i.user.fullName} className="h-8 w-8 text-[10px]" />
              </div>
            </div>
          ))}
          {data.recentInteractions.length === 0 && (
            <p className="py-6 text-sm text-slate-400">Sin actividad todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
