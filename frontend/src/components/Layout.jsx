import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { Avatar } from './Icon';

const navSections = [
  {
    title: null,
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
      { to: '/clients', label: 'Clientes', icon: 'clients', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
      { to: '/tasks', label: 'Tareas', icon: 'tasks', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
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

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
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
                            ? 'bg-indigo-500/15 text-white shadow-[inset_2px_0_0_0_#818cf8]'
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
