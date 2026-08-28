import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/SuperAdmin/Layout';
import CompanyAdminLayout from './components/layout/CompanyAdmin/Layout';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CompanyPage from './pages/Company';
import CompanyDashboard from './pages/CompanyDashboard';
import BranchManagement from './pages/BranchManagement';

const AppContent = () => {
  const { isAuthenticated, isCompanyAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Super Admin Routes - Each with its own AdminLayout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AdminLayout>
              <SuperAdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/companies"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AdminLayout>
              <CompanyPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Company Admin Routes - Each with its own CompanyAdminLayout */}
      <Route
        path="/company-dashboard"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <CompanyDashboard />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <BranchManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Redirects */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={isCompanyAdmin ? "/company-dashboard" : "/dashboard"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;