import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidth = isCollapsed ? 62 : 236;

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content */}
      <div
        style={{
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.2s cubic-bezier(0.22,1,0.36,1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header — fixed at top */}
        <Header toggleSidebar={() => setIsMobileOpen(!isMobileOpen)} />

        {/* Page Content */}
        <main style={{ flex: 1 }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
