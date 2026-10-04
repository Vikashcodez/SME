import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/SuperAdmin/Layout';
import CompanyAdminLayout from './components/layout/CompanyAdmin/Layout';
import BranchAdminLayout from './components/layout/BranchAdmin/Layout';
import EmployeeLayout from './components/layout/Employee/Layout';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CompanyPage from './pages/Company';
import CompanyDashboard from './pages/CompanyDashboard';
import BranchManagement from './pages/BranchManagement';
import BranchAdminDashboard from './pages/BranchAdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RolesMaster from './pages/Master Data/RolesMaster';
import DepartmentsMaster from './pages/Master Data/DepartmentsMaster';
import Employees from './pages/Master Data/Employees';
import VendorMaster from './pages/Master Data/VendorMaster';
import RawMaterialMaster from './pages/Master Data/RawMaterialMaster';
import ProductMaster from './pages/Master Data/ProductMaster';
import RawMaterialsInventory from './pages/Inventory/RawMaterialsInventory';
import AssetsInventory from './pages/Inventory/AssetsInventory';
import ProductionInventory from './pages/Inventory/ProductionInventory';

const AppContent = () => {
  const { isAuthenticated, isSuperAdmin, isCompanyAdmin, isBranchAdmin, isEmployee } = useAuth();

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

      <Route
        path="/roles"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <RolesMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/departments"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <DepartmentsMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <Employees />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <VendorMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/raw-materials"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <RawMaterialMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ProductMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/raw-material-inventory"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <RawMaterialsInventory />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/production"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ProductionInventory />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assets-inventory"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <AssetsInventory />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Branch Admin Routes - Each with its own BranchAdminLayout */}
      <Route
        path="/branch-dashboard"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <BranchAdminDashboard />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/roles"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <RolesMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/departments"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <DepartmentsMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/employees"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <Employees />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/vendors"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <VendorMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/raw-materials"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <RawMaterialMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/products"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ProductMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/raw-material-inventory"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <RawMaterialsInventory />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/production"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ProductionInventory />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/assets-inventory"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <AssetsInventory />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin-dashboard"
        element={<Navigate to="/branch-dashboard" replace />}
      />

      {/* Employee Routes - Each with its own EmployeeLayout */}
      <Route
        path="/employee-dashboard"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeLayout>
              <EmployeeDashboard />
            </EmployeeLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Redirects */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isSuperAdmin ? (
              <Navigate to="/dashboard" replace />
            ) : isBranchAdmin ? (
              <Navigate to="/branch-dashboard" replace />
            ) : isCompanyAdmin ? (
              <Navigate to="/company-dashboard" replace />
            ) : (
              <Navigate to="/employee-dashboard" replace />
            )
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