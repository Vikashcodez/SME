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
import GrnManagement from './pages/Inventory/GrnManagement';
import ProductionMasterManagement from './pages/Master Data/ProductionMasterManagement';
import ProductionOrderManagement from './pages/Inventory/ProductionOrderManagement';
import QualityCheckManagement from './pages/Inventory/QualityCheckManagement';
import ReworkManagement from './pages/Inventory/ReworkManagement';
import FinishedGoodsInventory from './pages/Inventory/FinishedGoodsInventory';
import CustomerMaster from './pages/Master Data/CustomerMaster';
import ChartOfAccounts from './pages/Commercial/ChartOfAccounts';
import SalesInvoiceManagement from './pages/Commercial/SalesInvoiceManagement';
import ReceiptManagement from './pages/Commercial/ReceiptManagement';
import TrialBalance from './pages/Commercial/TrialBalance';
import SalesOrderManagement from './pages/Commercial/SalesOrderManagement';
import DayBook from './pages/Commercial/DayBook';
import ProfitAndLoss from './pages/Commercial/ProfitAndLoss';
import BalanceSheet from './pages/Commercial/BalanceSheet';
import PurchaseInvoiceManagement from './pages/Commercial/PurchaseInvoiceManagement';
import ManufacturingJournal from './pages/Commercial/ManufacturingJournal';
import Compliance from './pages/Commercial/Compliance';
import LedgerManagement from './pages/Commercial/LedgerManagement';

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
        path="/ledger-management"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <LedgerManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/compliance"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <Compliance />
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

      <Route
        path="/grn"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <GrnManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/production-masters"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ProductionMasterManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/production-orders"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ProductionOrderManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quality-checks"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <QualityCheckManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rework-management"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ReworkManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/product-inventory"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <FinishedGoodsInventory />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <CustomerMaster />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chart-of-accounts"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ChartOfAccounts />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales-invoices"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <SalesInvoiceManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quotations-orders"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <SalesOrderManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/receipts-settlement"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ReceiptManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/trial-balance"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <TrialBalance />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/day-book"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <DayBook />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profit-and-loss"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ProfitAndLoss />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/balance-sheet"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <BalanceSheet />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-invoices"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <PurchaseInvoiceManagement />
            </CompanyAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manufacturing-journal"
        element={
          <ProtectedRoute requiredRole="company_admin">
            <CompanyAdminLayout>
              <ManufacturingJournal />
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
        path="/branch/grn"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <GrnManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/production-masters"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ProductionMasterManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/production-orders"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ProductionOrderManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/quality-checks"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <QualityCheckManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/rework-management"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ReworkManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/product-inventory"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <FinishedGoodsInventory />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/customers"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <CustomerMaster />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/chart-of-accounts"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ChartOfAccounts />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/ledger-management"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <LedgerManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/sales-invoices"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <SalesInvoiceManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/quotations-orders"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <SalesOrderManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/receipts-settlement"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ReceiptManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/trial-balance"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <TrialBalance />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/day-book"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <DayBook />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/profit-and-loss"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ProfitAndLoss />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/balance-sheet"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <BalanceSheet />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/compliance"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <Compliance />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/purchase-invoices"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <PurchaseInvoiceManagement />
            </BranchAdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/manufacturing-journal"
        element={
          <ProtectedRoute requiredRole="branch_admin">
            <BranchAdminLayout>
              <ManufacturingJournal />
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

      <Route
        path="/employee/compliance"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeLayout>
              <Compliance />
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