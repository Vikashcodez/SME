import { useState, useEffect } from "react";
import { Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { SCHEMA } from "../../data/schema";
import { useAuth } from "../../context/AuthContext";
import { AppDataProvider } from "../../context/AppDataContext";
import { UIPreferencesProvider } from "../../context/UIPreferencesContext";
import { BreadcrumbProvider } from "../../context/BreadcrumbContext";
import { ToastProvider } from "../ui/Toast";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const userName = user?.username || user?.name || (user?.email ? user.email.split('@')[0] : "Admin");

  const activeCode = location.pathname.startsWith("/app/dashboard")
    ? "G2"
    : location.pathname.startsWith("/app/help")
    ? "G3"
    : location.pathname.startsWith("/admin")
    ? "ADMIN"
    : params.code;

  const screensArray = Array.isArray(SCHEMA?.screens) ? SCHEMA.screens : Object.values(SCHEMA?.screens || {});
  const activeScreen = screensArray.find((s) => s.code === activeCode);

  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  return (
    <AppDataProvider>
      <UIPreferencesProvider>
        <BreadcrumbProvider>
          <ToastProvider>
            <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
              <Sidebar
                schema={SCHEMA}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed((c) => !c)}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
              />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar
                  screenTitle={activeScreen ? activeScreen.title : activeCode === "ADMIN" ? "Company Manager" : "Dashboard"}
                  moduleName={activeScreen ? activeScreen.module : "Global"}
                  screenCode={activeCode}
                  onMenuClick={() => setMobileOpen(true)}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  user={userName}
                  onSignOut={handleSignOut}
                />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                  <div className="max-w-[1600px] mx-auto">
                    <Outlet />
                  </div>
                </main>
              </div>

              
              <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
              />
            </div>
          </ToastProvider>
        </BreadcrumbProvider>
      </UIPreferencesProvider>
    </AppDataProvider>
  );
}

export default AppLayout;
