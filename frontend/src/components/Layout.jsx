import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { Avatar } from './Icon';

const navSections = [
  {
    title: 'General',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
      { to: '/calendar', label: 'Calendario', icon: 'calendar', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { to: '/deals', label: 'Negocios', icon: 'briefcase', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
      { to: '/clients', label: 'Clientes', icon: 'clients', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
      { to: '/companies', label: 'Empresas', icon: 'building', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Actividad',
    items: [
      { to: '/tasks', label: 'Tareas', icon: 'tasks', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Reportes',
    items: [
      { to: '/reports', label: 'Reportes', icon: 'trendingUp', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/admin/users', label: 'Usuarios', icon: 'users', roles: ['ADMIN'] },
      { to: '/admin/statuses', label: 'Estatus', icon: 'settings', roles: ['ADMIN'] },
    ],
  },
];

const ROLE_LABELS = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', AGENT: 'Agente' };

const QUICK_CREATE = [
  { label: 'Nuevo cliente', to: '/clients', icon: 'clients' },
  { label: 'Nuevo negocio', to: '/deals', icon: 'briefcase' },
  { label: 'Nueva empresa', to: '/companies', icon: 'building' },
];

function currentSectionLabel(pathname) {
  const flat = navSections.flatMap((s) => s.items);
  const match = flat.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)));
  if (match) return match.label;
  if (pathname.startsWith('/admin')) return 'Administración';
  return 'ISM CRM';
}

function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
      >
        <Icon name="plus" className="h-4 w-4" />
        Crear
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {QUICK_CREATE.map((item) => (
            <button
              key={item.to}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); navigate(item.to, { state: { openNew: true } }); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Icon name={item.icon} className="h-4 w-4 text-slate-400" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-orange-500/30">
            ISM
          </span>
          <div>
            <div className="text-sm font-semibold text-white">ISM CRM</div>
            <div className="text-[11px] text-slate-400">Gestión de clientes</div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {navSections.map((section, si) => {
            const visible = section.items.filter((item) => item.roles.includes(user?.role));
            if (visible.length === 0) return null;
            return (
              <div key={si}>
                {section.title && (
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {visible.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-orange-500/15 text-white shadow-[inset_2px_0_0_0_#fb923c]'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <Icon name={item.icon} className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={user?.fullName} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.fullName}</div>
              <div className="text-[11px] text-slate-400">{ROLE_LABELS[user?.role] ?? user?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>ISM CRM</span>
            <Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-medium text-slate-900">{currentSectionLabel(location.pathname)}</span>
          </div>
          <QuickCreateMenu />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
