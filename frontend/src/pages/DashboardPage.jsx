import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Icon, { Avatar } from '../components/Icon';
import TrendChart from '../components/TrendChart';

const TYPE_LABELS = { CALL: 'Llamada', EMAIL: 'Email', WHATSAPP: 'WhatsApp', SMS: 'SMS', VISIT: 'Visita', OTHER: 'Otro' };
const TYPE_ICONS = { CALL: 'phone', EMAIL: 'mail', WHATSAPP: 'phone', SMS: 'mail', VISIT: 'clients', OTHER: 'activity' };
const BAR_COLORS = ['bg-orange-500', 'bg-violet-500', 'bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function formatAmount(amount) {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

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
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [tasks, setTasks] = useState({ today: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary').catch((err) => { console.error('dashboard/summary failed', err); return null; }),
      api.get('/reports/overview').catch((err) => { console.error('reports/overview failed', err); return null; }),
      api.get('/clients/tasks/today').catch(() => ({ data: [] })),
      api.get('/clients/tasks/overdue').catch(() => ({ data: [] })),
    ])
      .then(([summaryRes, reportRes, today, overdue]) => {
        setSummary(summaryRes?.data ?? null);
        setReport(reportRes?.data ?? null);
        setTasks({ today: today.data.length, overdue: overdue.data.length });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    const res = await api.get('/dashboard/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contactos.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  const sortedAgents = report ? [...report.agentPerformance].sort((a, b) => b.dealsWonValue - a.dealsWonValue) : [];

  function ErrorNote({ children }) {
    return (
      <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {children}
      </div>
    );
  }

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

      {!summary && !report && (
        <ErrorNote>
          No se pudo cargar la información del dashboard. Puede ser un problema temporal del servidor — intenta
          recargar la página en un minuto; si sigue igual, avisa para revisar el servidor.
        </ErrorNote>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary && <StatCard icon="clients" label="Total de contactos" value={summary.totalClients} accent="bg-orange-50 text-orange-600" />}
        {report && <StatCard icon="briefcase" label="Negocios en curso" value={formatAmount(report.pipelineValue)} accent="bg-amber-50 text-amber-600" />}
        <StatCard icon="calendar" label="Seguimientos hoy" value={tasks.today} accent="bg-sky-50 text-sky-600" />
        <StatCard icon="clock" label="Seguimientos vencidos" value={tasks.overdue} accent="bg-rose-50 text-rose-600" sub={tasks.overdue > 0 ? 'Requieren atención' : 'Todo al día'} />
      </div>

      {report && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="trendingUp" label="Tasa de cierre" value={formatPercent(report.winRate)} accent="bg-emerald-50 text-emerald-600" sub={`${report.wonCount} ganados · ${report.lostCount} perdidos`} />
          <StatCard icon="chart" label="Ticket promedio" value={formatAmount(report.avgDealSize)} accent="bg-violet-50 text-violet-600" sub="Negocios ganados" />
          <StatCard icon="activity" label="Interacciones (30 días)" value={report.interactionTrend.reduce((acc, d) => acc + d.count, 0)} accent="bg-teal-50 text-teal-600" />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Icon name="chart" className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Contactos por estatus</h2>
            </div>
            <BarList
              items={summary.byStatus.map((s) => ({ key: s.statusId, label: s.statusName ?? '—', count: s.count }))}
              emptyText="Sin contactos todavía."
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Icon name="activity" className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Actividad por tipo</h2>
            </div>
            <BarList
              items={summary.byInteractionType.map((t) => ({ key: t.type, label: TYPE_LABELS[t.type] ?? t.type, count: t.count }))}
              emptyText="Sin interacciones registradas."
            />
          </div>
        </div>
      )}

      {report && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="activity" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Actividad de los últimos 30 días</h2>
          </div>
          <TrendChart data={report.interactionTrend} />
        </div>
      )}

      {report && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Desempeño por agente</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contactos</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Negocios</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ganados</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Valor ganado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAgents.map((a) => (
                <tr key={a.agentId}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.agentName} className="h-7 w-7 text-[10px]" />
                      <span className="font-medium text-slate-900">{a.agentName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{a.clients}</td>
                  <td className="px-5 py-3 text-slate-600">{a.dealsTotal}</td>
                  <td className="px-5 py-3 text-slate-600">{a.dealsWon}</td>
                  <td className="px-5 py-3 font-medium text-orange-600">{formatAmount(a.dealsWonValue)}</td>
                </tr>
              ))}
              {sortedAgents.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Sin datos de agentes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
          </div>
          <div className="divide-y divide-slate-100 px-5">
            {summary.recentInteractions.map((i) => (
              <div key={i.id} className="flex items-center gap-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon name={TYPE_ICONS[i.type] ?? 'activity'} className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Link to={`/clients/${i.client.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
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
            {summary.recentInteractions.length === 0 && (
              <p className="py-6 text-sm text-slate-400">Sin actividad todavía.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
