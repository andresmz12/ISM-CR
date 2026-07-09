import Icon, { Avatar } from './Icon';

const COLUMN_ACCENTS = {
  PROSPECTING: 'bg-slate-400', QUALIFICATION: 'bg-sky-400', PROPOSAL: 'bg-amber-400',
  NEGOTIATION: 'bg-orange-400', WON: 'bg-emerald-400', LOST: 'bg-rose-400',
};

function formatAmount(amount) {
  if (amount == null) return null;
  return `$${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
}

export default function DealsKanban({ stages, deals, onDropDeal, onOpenDeal, dragId, setDragId, overStage, setOverStage }) {
  const columns = stages.map((stage) => {
    const items = deals.filter((d) => d.stage === stage.value);
    return { stage, items, total: items.reduce((acc, d) => acc + (d.amount ?? 0), 0) };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ stage, items, total }) => (
        <div
          key={stage.value}
          onDragOver={(e) => { e.preventDefault(); setOverStage(stage.value); }}
          onDragLeave={() => setOverStage((s) => (s === stage.value ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onDropDeal(dragId, stage.value);
            setOverStage(null);
            setDragId(null);
          }}
          className={`flex w-72 shrink-0 flex-col rounded-2xl border transition ${
            overStage === stage.value
              ? 'border-orange-400 bg-orange-50/70 ring-2 ring-orange-200'
              : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="px-3 pt-3">
            <div className={`h-1 rounded-full ${COLUMN_ACCENTS[stage.value] ?? 'bg-slate-400'}`} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">{stage.label}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">{items.length}</span>
          </div>
          {total > 0 && <div className="px-4 pb-2 text-xs font-medium text-slate-500">{formatAmount(total)}</div>}
          <div className="flex-1 space-y-2 px-3 pb-3">
            {items.map((deal) => (
              <div
                key={deal.id}
                draggable
                onDragStart={() => setDragId(deal.id)}
                onClick={() => onOpenDeal(deal)}
                className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  dragId === deal.id ? 'opacity-50' : ''
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{deal.title}</div>
                {deal.amount != null && (
                  <div className="mt-1 text-sm font-medium text-orange-600">{formatAmount(deal.amount)}</div>
                )}
                {deal.client && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon name="clients" className="h-3.5 w-3.5" />{deal.client.fullName}
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {deal.owner && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      <Avatar name={deal.owner.fullName} className="h-4 w-4 text-[8px]" />
                      {deal.owner.fullName}
                    </span>
                  )}
                  {deal.expectedCloseDate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                      <Icon name="calendar" className="h-3 w-3" />
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                Arrastra negocios aquí
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
