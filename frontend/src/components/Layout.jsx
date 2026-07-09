import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { Avatar } from './Icon';
import GlobalSearch from './GlobalSearch';

const navSections = [
  {
    title: 'General',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { to: '/clients', label: 'Clientes', icon: 'clients', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Actividad',
    items: [
      { to: '/agenda', label: 'Agenda', icon: 'tasks', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Proyectos',
    items: [
      { to: '/projects', label: 'Proyectos', icon: 'folder', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/admin/users', label: 'Usuarios', icon: 'users', roles: ['ADMIN'] },
      { to: '/admin/statuses', label: 'Estatus', icon: 'settings', roles: ['ADMIN'] },
      { to: '/admin/api-keys', label: 'API Keys', icon: 'key', roles: ['ADMIN'] },
    ],
  },
];

const ROLE_LABELS = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', AGENT: 'Agente' };

function currentSectionLabel(pathname) {
  const flat = navSections.flatMap((s) => s.items);
  const match = flat.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)));
  if (match) return match.label;
  if (pathname.startsWith('/admin')) return 'Administración';
  return 'ISM CRM';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Al navegar (tocar un enlace) se cierra el menú en móvil.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-zinc-950 transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-orange-500/30">
            ISM
          </span>
          <div>
            <div className="text-sm font-semibold text-white">ISM CRM</div>
            <div className="text-[11px] text-zinc-500">Gestión de clientes</div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {navSections.map((section, si) => {
            const visible = section.items.filter((item) => item.roles.includes(user?.role));
            if (visible.length === 0) return null;
            return (
              <div key={si}>
                {section.title && (
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                            ? 'bg-orange-500/15 text-white shadow-[inset_2px_0_0_0_#f97316]'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
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
              <div className="text-[11px] text-zinc-500">{ROLE_LABELS[user?.role] ?? user?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Abrir menú"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <span>ISM CRM</span>
            <Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-300" />
            <span className="whitespace-nowrap font-medium text-slate-900">{currentSectionLabel(location.pathname)}</span>
          </div>
          <div className="flex flex-1 justify-end">
            <GlobalSearch />
          </div>
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
