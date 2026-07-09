import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { to: '/clients', label: 'Clientes', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { to: '/tasks', label: 'Tareas', roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { to: '/admin/users', label: 'Usuarios', roles: ['ADMIN'] },
  { to: '/admin/statuses', label: 'Estatus', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="text-lg font-semibold">ISM CRM</div>
          <div className="text-xs text-gray-500">{user?.fullName}</div>
          <div className="text-xs text-gray-400">{user?.role}</div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
