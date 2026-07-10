import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Icon, { Avatar } from './Icon';

const STAGE_LABELS = {
  PROSPECTING: 'Prospección', QUALIFICATION: 'Calificación', PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación', WON: 'Ganado', LOST: 'Perdido',
};

// Barra de búsqueda global del header: contactos, empresas y deals.
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    const t = setTimeout(() => {
      api.get('/search', { params: { q } })
        .then((res) => { setResults(res.data); setOpen(true); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(path) {
    setOpen(false);
    setQ('');
    navigate(path);
  }

  const hasResults = results && (results.clients.length || results.companies.length || results.deals.length);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (results) setOpen(true); }}
        placeholder="Buscar contactos, empresas, deals..."
        className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm transition focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
      />
      {open && results && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {!hasResults && <p className="px-4 py-3 text-sm text-slate-400">Sin resultados para “{q}”.</p>}

          {results.clients.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contactos</p>
              {results.clients.map((c) => (
                <button key={c.id} onClick={() => go(`/clients/${c.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                  <Avatar name={c.fullName} className="h-7 w-7 text-[10px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{c.fullName}</span>
                    <span className="block truncate text-xs text-slate-400">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
                  </span>
                  {c.status?.name && <span className="shrink-0 text-xs text-slate-400">{c.status.name}</span>}
                </button>
              ))}
            </div>
          )}

          {results.companies.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Empresas</p>
              {results.companies.map((c) => (
                <button key={c.id} onClick={() => go(`/companies/${c.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                  <Icon name="building" className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{c.name}</span>
                  {c.industry && <span className="shrink-0 text-xs text-slate-400">{c.industry}</span>}
                </button>
              ))}
            </div>
          )}

          {results.deals.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Deals</p>
              {results.deals.map((d) => (
                <button key={d.id} onClick={() => go('/deals')}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                  <Icon name="briefcase" className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{d.title}</span>
                    {d.client && <span className="block truncate text-xs text-slate-400">{d.client.fullName}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{STAGE_LABELS[d.stage] ?? d.stage}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
