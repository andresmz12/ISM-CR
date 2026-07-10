import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import NewWorkspaceModal from '../components/NewWorkspaceModal';
import Icon, { Avatar } from '../components/Icon';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canCreate = user.role === 'ADMIN' || user.role === 'SUPERVISOR';

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(!!location.state?.openNew);

  const fetchWorkspaces = useCallback(() => {
    setLoading(true);
    return api.get('/workspaces').then((res) => setWorkspaces(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);
  useEffect(() => {
    if (location.state?.openNew) navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Empresas</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {canCreate ? `${workspaces.length} empresas en total` : 'Empresas donde formas parte del equipo'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nueva empresa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((w) => (
          <Link
            key={w.id}
            to={`/workspaces/${w.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Icon name="building" className="h-5 w-5" />
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">{w.name}</h2>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {w.members.slice(0, 4).map((m) => (
                  <Avatar key={m.id} name={m.user.fullName} className="h-7 w-7 border-2 border-white text-[10px]" />
                ))}
                {w.members.length > 4 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-medium text-slate-500">
                    +{w.members.length - 4}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-slate-400">{w._count.clients} clientes</span>
            </div>
          </Link>
        ))}
        {workspaces.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Icon name="building" className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-slate-400">
              {canCreate ? 'Todavía no hay empresas.' : 'No formas parte de ninguna empresa todavía.'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <NewWorkspaceModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchWorkspaces(); }} />
      )}
    </div>
  );
}
