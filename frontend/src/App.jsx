import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ClientDetailPage from './pages/ClientDetailPage';
import DealsPage from './pages/DealsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminStatusesPage from './pages/AdminStatusesPage';
import AdminApiKeysPage from './pages/AdminApiKeysPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Empresa-primero: la lista de empresas es la pantalla de inicio.
                  Los contactos/agenda/tareas viven dentro del detalle de cada
                  empresa; solo el detalle de un contacto conserva URL propia. */}
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/statuses" element={<AdminStatusesPage />} />
                <Route path="/admin/api-keys" element={<AdminApiKeysPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
