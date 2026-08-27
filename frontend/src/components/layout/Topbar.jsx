import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell, User, Settings, LogOut, Building, ShieldCheck, Sparkles, Search, Command, Briefcase } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { useBreadcrumbExtra } from "../../context/BreadcrumbContext";
import { useCompany } from "../../context/CompanyContext";
import { useAuth } from "../../context/AuthContext";

function initialsOf(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ screenTitle, moduleName, screenCode, onMenuClick, onOpenCommandPalette, user, onSignOut }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const { extra } = useBreadcrumbExtra();
  const { companiesList, activeCompany, activeCompanyCode, switchCompany, businessType, changeBusinessType } = useCompany();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const firstName = String(user || "").trim().split(/\s+/)[0] || "there";

  const businessModelLabels = {
    hybrid: "Hybrid Enterprise",
    manufacturing: "Manufacturing & Production",
    services: "Professional Services & Billing",
    trading: "Trading & Wholesale Distribution",
  };

  return (
    <header className="h-16 flex items-center justify-between gap-3 px-4 lg:px-6 border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Breadcrumb moduleName={moduleName} screenTitle={screenTitle} screenCode={screenCode} extra={extra} />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs transition-colors shadow-xs"
          title="Search all screens (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 text-[#0D9488]" />
          <span className="font-medium">Search screens...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
            Ctrl K
          </kbd>
        </button>

        
        <div className="relative">
          <button
            onClick={() => setCompanyMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 transition-colors shadow-xs"
          >
            <Building className="h-4 w-4 text-[#0D9488] flex-shrink-0" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">
              {activeCompany?.company_name || "Chandra Precision"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono font-bold capitalize">
              {businessType || "Hybrid"}
            </span>
          </button>

          {companyMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCompanyMenuOpen(false)} />
              <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-popover ring-1 ring-slate-200 border border-slate-200 py-2 z-20 animate-slideUp">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488]">Active Organization</p>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {(companiesList || []).map((comp) => (
                    <button
                      key={comp.company_code}
                      onClick={() => {
                        switchCompany(comp.company_code);
                        setCompanyMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                        comp.company_code === activeCompanyCode ? "bg-teal-50 text-[#0F766E] font-semibold" : "text-slate-700"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-semibold">{comp.company_name}</p>
                        <p className="text-[11px] text-slate-500">{comp.company_type || "Company"}</p>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                        {comp.company_code}
                      </span>
                    </button>
                  ))}
                </div>

                
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-[#0D9488]" /> ERP Operating Model
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {[
                      { key: "hybrid", label: "Hybrid Enterprise" },
                      { key: "manufacturing", label: "Manufacturing" },
                      { key: "services", label: "Services & Billing" },
                      { key: "trading", label: "Distribution" },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => changeBusinessType(m.key)}
                        className={`px-2 py-1 rounded-md text-left font-medium transition-colors ${
                          businessType === m.key
                            ? "bg-[#0D9488] text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 pt-2 border-t border-slate-100">
                  <Link
                    to="/admin"
                    onClick={() => setCompanyMenuOpen(false)}
                    className="flex items-center gap-1.5 text-xs text-[#0D9488] hover:text-[#0F766E] font-semibold py-1 transition-colors"
                  >
                    <Building className="h-3.5 w-3.5" />
                    <span>Manage Companies & Tenants</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            aria-label="User menu"
          >
            <div className="h-8 w-8 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center text-xs font-bold shadow-xs">
              {initialsOf(user)}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight min-w-0">
              <p className="font-semibold text-slate-800 truncate max-w-[100px]">{firstName}</p>
              <p className="text-[10px] text-slate-500">{isSuperAdmin ? "Super Admin" : "Operations"}</p>
            </div>
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-popover ring-1 ring-slate-200 border border-slate-200 py-1.5 z-20 animate-slideUp text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user || "Enterprise User"}</p>
                  <p className="text-[11px] text-slate-500">Chandra Precision Platform</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/app/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    <span>User Profile</span>
                  </Link>

                  {isSuperAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
                      <span>Admin Management</span>
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
