import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon, { Avatar } from '../components/Icon';
import TrendChart from '../components/TrendChart';

function formatAmount(amount) {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

function BarList({ items, emptyText }) {
  const BAR_COLORS = ['bg-orange-500', 'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
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
            <div className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`} style={{ width: `${(item.count / max) * 100}%` }} />
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

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/overview').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!data) return <p className="text-slate-500">No se pudo cargar el reporte.</p>;

  const totalInteractions30d = data.interactionTrend.reduce((acc, d) => acc + d.count, 0);
  const sortedAgents = [...data.agentPerformance].sort((a, b) => b.dealsWonValue - a.dealsWonValue);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes</h1>
        <p className="mt-0.5 text-sm text-slate-500">Desempeño comercial y analítica de negocios</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="briefcase" label="Pipeline abierto" value={formatAmount(data.pipelineValue)} accent="bg-orange-50 text-orange-600" />
        <StatCard icon="trendingUp" label="Tasa de cierre" value={formatPercent(data.winRate)} accent="bg-emerald-50 text-emerald-600" sub={`${data.wonCount} ganados · ${data.lostCount} perdidos`} />
        <StatCard icon="chart" label="Ticket promedio" value={formatAmount(data.avgDealSize)} accent="bg-sky-50 text-sky-600" sub="Negocios ganados" />
        <StatCard icon="activity" label="Interacciones (30 días)" value={totalInteractions30d} accent="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="activity" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Actividad de los últimos 30 días</h2>
          </div>
          <TrendChart data={data.interactionTrend} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="chart" className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Embudo por estatus</h2>
          </div>
          <BarList
            items={data.funnelByStatus.map((s) => ({ key: s.statusId, label: s.statusName ?? '—', count: s.count }))}
            emptyText="Sin clientes todavía."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Desempeño por agente</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes</th>
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
    </div>
  );
}
