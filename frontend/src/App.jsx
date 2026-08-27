import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { UIPreferencesProvider } from "./context/UIPreferencesContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Skeleton } from "./components/ui/Skeleton";

import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ScreenPage } from "./pages/ScreenPage";

const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const NotificationsHelpPage = lazy(() => import("./pages/NotificationsHelpPage"));

const MasterHubPage = lazy(() => import("./pages/modules/masters/MasterHubPage"));
const VoucherEntryPage = lazy(() => import("./pages/modules/accounts/VoucherEntryPage"));
const DayBookPage = lazy(() => import("./pages/modules/accounts/DayBookPage"));
const TrialBalancePage = lazy(() => import("./pages/modules/accounts/TrialBalancePage"));
const ProfitLossPage = lazy(() => import("./pages/modules/accounts/ProfitLossPage"));
const BalanceSheetPage = lazy(() => import("./pages/modules/accounts/BalanceSheetPage"));
const BankingPage = lazy(() => import("./pages/modules/accounts/BankingPage"));
const AccountsPlanningHubPage = lazy(() => import("./pages/modules/accounts/AccountsPlanningHubPage"));
const TaxationHubPage = lazy(() => import("./pages/modules/taxation/TaxationHubPage"));
const SalesHubPage = lazy(() => import("./pages/modules/sales/SalesHubPage"));
const ProcurementHubPage = lazy(() => import("./pages/modules/procurement/ProcurementHubPage"));
const InventoryHubPage = lazy(() => import("./pages/modules/inventory/InventoryHubPage"));
const ManufacturingHubPage = lazy(() => import("./pages/modules/manufacturing/ManufacturingHubPage"));
const QualityHubPage = lazy(() => import("./pages/modules/quality/QualityHubPage"));
const AssetHubPage = lazy(() => import("./pages/modules/assets/AssetHubPage"));
const ProjectHubPage = lazy(() => import("./pages/modules/projects/ProjectHubPage"));
const HrHubPage = lazy(() => import("./pages/modules/hr/HrHubPage"));
const LogisticsHubPage = lazy(() => import("./pages/modules/logistics/LogisticsHubPage"));
const ComplianceHubPage = lazy(() => import("./pages/modules/compliance/ComplianceHubPage"));
const AiHubPage = lazy(() => import("./pages/modules/ai/AiHubPage"));
const AccessHubPage = lazy(() => import("./pages/modules/access/AccessHubPage"));
const RetailHubPage = lazy(() => import("./pages/modules/retail/RetailHubPage"));
const DocumentHubPage = lazy(() => import("./pages/modules/documents/DocumentHubPage"));
const BiHubPage = lazy(() => import("./pages/modules/bi/BiHubPage"));
const IntegrationHubPage = lazy(() => import("./pages/modules/integrations/IntegrationHubPage"));

function PageLoadingFallback() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn" aria-label="Loading page content">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-card">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-card">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-card">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-card">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-card">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole, requiredModule }) {
  const { isAuthenticated, role, hasPermission, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0D9488]"></div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Chandra Precision ERP...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole && role !== "super_admin") {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (requiredModule && !hasPermission(requiredModule, "view")) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center shadow-card">
        <h1 className="text-4xl font-black text-slate-900 font-mono">404</h1>
        <h2 className="text-lg font-bold text-slate-800 mt-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">
          The requested route does not exist or you do not have permission to view it.
        </p>
        <div className="mt-6">
          <a
            href="/#/app/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

        
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          
          <Route path="masters" element={<MasterHubPage />} />

          
          <Route path="access" element={<AccessHubPage />} />

          
          <Route path="sales" element={<SalesHubPage />} />

          
          <Route path="procurement" element={<ProcurementHubPage />} />

          
          <Route path="inventory" element={<InventoryHubPage />} />

          
          <Route path="manufacturing" element={<ManufacturingHubPage />} />

          
          <Route path="quality" element={<QualityHubPage />} />

          
          <Route path="logistics" element={<LogisticsHubPage />} />

          
          <Route path="projects" element={<ProjectHubPage />} />

          
          <Route path="retail" element={<RetailHubPage />} />

          
          <Route path="assets" element={<AssetHubPage />} />

          
          <Route path="hr" element={<HrHubPage />} />

          
          <Route path="accounts" element={<Navigate to="accounts/voucher-entry" replace />} />
          <Route path="accounts/voucher-entry" element={<VoucherEntryPage />} />
          <Route path="accounts/day-book" element={<DayBookPage />} />
          <Route path="accounts/trial-balance" element={<TrialBalancePage />} />
          <Route path="accounts/profit-loss" element={<ProfitLossPage />} />
          <Route path="accounts/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="accounts/banking" element={<BankingPage />} />
          <Route path="accounts/budgeting" element={<AccountsPlanningHubPage forcedTab="budgeting" />} />
          <Route path="accounts/treasury" element={<AccountsPlanningHubPage forcedTab="treasury" />} />
          <Route path="accounts/depreciation" element={<AccountsPlanningHubPage forcedTab="depreciation" />} />
          <Route path="accounts/forex" element={<AccountsPlanningHubPage forcedTab="forex" />} />
          <Route path="accounts/cost-centers" element={<AccountsPlanningHubPage forcedTab="cost-centers" />} />

          
          <Route path="taxation" element={<TaxationHubPage />} />

          
          <Route path="compliance" element={<ComplianceHubPage />} />

          
          <Route path="documents" element={<DocumentHubPage />} />

          
          <Route path="bi" element={<BiHubPage />} />

          
          <Route path="ai" element={<AiHubPage />} />

          
          <Route path="integrations" element={<IntegrationHubPage />} />

          
          <Route path="users" element={<UserManagementPage />} />
          <Route path="help" element={<NotificationsHelpPage />} />

          
          <Route path="screen/:code" element={<ScreenPage />} />
        </Route>

        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <UIPreferencesProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#0F172A",
                color: "#F8FAFC",
                fontSize: "13px",
                borderRadius: "12px",
                padding: "12px 16px",
              },
              success: {
                iconTheme: {
                  primary: "#0D9488",
                  secondary: "#FFFFFF",
                },
              },
              error: {
                iconTheme: {
                  primary: "#E11D48",
                  secondary: "#FFFFFF",
                },
              },
            }}
          />
          <AppRoutes />
        </UIPreferencesProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
