import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DealsKanban from '../components/DealsKanban';
import DealModal from '../components/DealModal';
import Icon, { Avatar } from '../components/Icon';

const STAGES = [
  { value: 'PROSPECTING', label: 'Prospección' },
  { value: 'QUALIFICATION', label: 'Calificación' },
  { value: 'PROPOSAL', label: 'Propuesta' },
  { value: 'NEGOTIATION', label: 'Negociación' },
  { value: 'WON', label: 'Ganado' },
  { value: 'LOST', label: 'Perdido' },
];

function formatAmount(amount) {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
}

export default function DealsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canAssignOwner = user.role !== 'AGENT';

  const [view, setView] = useState('kanban');
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalDeal, setModalDeal] = useState(null);
  const [showModal, setShowModal] = useState(!!location.state?.openNew);

  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  const fetchDeals = useCallback(() => {
    setLoading(true);
    return api.get('/deals').then((res) => setDeals(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => {
    api.get('/companies').then((res) => setCompanies(res.data)).catch(() => {});
    if (canAssignOwner) api.get('/users').then((res) => setAgents(res.data.filter((u) => u.active))).catch(() => {});
  }, [canAssignOwner]);

  useEffect(() => {
    if (location.state?.openNew) navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  async function handleDropDeal(dealId, newStage) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));
    try {
      await api.patch(`/deals/${dealId}`, { stage: newStage });
    } catch {
      fetchDeals();
    }
  }

  const totalPipeline = deals.filter((d) => !['WON', 'LOST'].includes(d.stage)).reduce((acc, d) => acc + (d.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Negocios</h1>
          <p className="mt-0.5 text-sm text-slate-500">{deals.length} negocios · pipeline abierto {formatAmount(totalPipeline)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm shadow-sm">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tabla
            </button>
          </div>
          <button
            onClick={() => { setModalDeal(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nuevo negocio
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
        </div>
      ) : view === 'kanban' ? (
        <DealsKanban
          stages={STAGES}
          deals={deals}
          onDropDeal={handleDropDeal}
          onOpenDeal={(deal) => { setModalDeal(deal); setShowModal(true); }}
          dragId={dragId}
          setDragId={setDragId}
          overStage={overStage}
          setOverStage={setOverStage}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Negocio</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Monto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dueño</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cierre estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((d) => (
                <tr key={d.id} onClick={() => { setModalDeal(d); setShowModal(true); }} className="cursor-pointer transition hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-semibold text-slate-900">{d.title}</td>
                  <td className="px-5 py-3 text-slate-600">{d.client?.fullName ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {STAGES.find((s) => s.value === d.stage)?.label ?? d.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-700">{formatAmount(d.amount)}</td>
                  <td className="px-5 py-3">
                    {d.owner ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Avatar name={d.owner.fullName} className="h-6 w-6 text-[9px]" />
                        {d.owner.fullName}
                      </div>
                    ) : <span className="text-slate-400">Sin asignar</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Icon name="briefcase" className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-slate-400">Sin negocios todavía.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <DealModal
          deal={modalDeal}
          companies={companies}
          agents={agents}
          canAssignOwner={canAssignOwner}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchDeals(); }}
          onDeleted={() => { setShowModal(false); fetchDeals(); }}
        />
      )}
    </div>
  );
}
