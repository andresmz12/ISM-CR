import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Icon, { Avatar } from '../components/Icon';

const STAGE_LABELS = {
  PROSPECTING: 'Prospección', QUALIFICATION: 'Calificación', PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación', WON: 'Ganado', LOST: 'Perdido',
};

function formatAmount(amount) {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCompany = useCallback(() => {
    setLoading(true);
    return api.get(`/companies/${id}`).then((res) => setCompany(res.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  function startEditing() {
    setForm({ name: company.name, industry: company.industry ?? '', phone: company.phone ?? '', website: company.website ?? '', address: company.address ?? '', notes: company.notes ?? '' });
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/companies/${id}`, form);
      setEditing(false);
      fetchCompany();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar la empresa "${company.name}"? Los clientes y negocios vinculados quedarán sin empresa asignada.`)) return;
    await api.delete(`/companies/${id}`);
    navigate('/companies');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }
  if (!company) return <p className="text-slate-500">Empresa no encontrada.</p>;

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="space-y-6">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-600">
        <Icon name="chevronLeft" className="h-4 w-4" /> Volver a empresas
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Industria</label>
                <input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sitio web</label>
                <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Icon name="building" className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{company.name}</h1>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                  {company.industry && <span>{company.industry}</span>}
                  {company.phone && <span className="flex items-center gap-1.5"><Icon name="phone" className="h-3.5 w-3.5 text-slate-400" />{company.phone}</span>}
                  {company.website && <span>{company.website}</span>}
                </div>
                {company.address && <p className="mt-1 text-sm text-slate-500">{company.address}</p>}
                {company.notes && <p className="mt-2 text-sm text-slate-500">{company.notes}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={startEditing} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Editar</button>
              <button onClick={handleDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Eliminar</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Clientes vinculados ({company.clients.length})</h2>
          <div className="divide-y divide-slate-100">
            {company.clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.fullName} className="h-8 w-8 text-[10px]" />
                  <Link to={`/clients/${c.id}`} className="text-sm font-medium text-slate-900 hover:text-orange-600">{c.fullName}</Link>
                </div>
                <StatusBadge name={c.status?.name} />
              </div>
            ))}
            {company.clients.length === 0 && <p className="py-4 text-sm text-slate-400">Sin clientes vinculados.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Negocios vinculados ({company.deals.length})</h2>
          <div className="divide-y divide-slate-100">
            {company.deals.map((d) => (
              <div key={d.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{d.title}</span>
                  <span className="text-sm font-medium text-orange-600">{formatAmount(d.amount)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{STAGE_LABELS[d.stage] ?? d.stage}</span>
                  {d.client && <span>{d.client.fullName}</span>}
                </div>
              </div>
            ))}
            {company.deals.length === 0 && <p className="py-4 text-sm text-slate-400">Sin negocios vinculados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
