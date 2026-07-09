import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import NewCompanyModal from '../components/NewCompanyModal';
import Icon from '../components/Icon';

export default function CompaniesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(!!location.state?.openNew);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    return api.get('/companies', { params: { search: search || undefined } })
      .then((res) => setCompanies(res.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => {
    if (location.state?.openNew) navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Empresas</h1>
          <p className="mt-0.5 text-sm text-slate-500">{companies.length} empresas registradas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nueva empresa
        </button>
      </div>

      <div className="relative w-72">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className={`${inputCls} w-full pl-9`}
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Industria</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Negocios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <Link to={`/companies/${c.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Icon name="building" className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-slate-900 hover:text-orange-600">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.industry || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.phone && <div>{c.phone}</div>}
                    {c.website && <div className="text-xs text-slate-400">{c.website}</div>}
                    {!c.phone && !c.website && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c._count?.clients ?? 0}</td>
                  <td className="px-5 py-3 text-slate-600">{c._count?.deals ?? 0}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Icon name="building" className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-slate-400">No hay empresas registradas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NewCompanyModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchCompanies(); }} />
      )}
    </div>
  );
}
