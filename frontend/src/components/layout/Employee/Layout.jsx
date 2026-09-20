import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidth = isCollapsed ? 64 : 240;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div
        style={{
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.2s cubic-bezier(0.22,1,0.36,1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Header toggleSidebar={() => setIsMobileOpen(!isMobileOpen)} />

        {/* Page View */}
        <main style={{ flex: 1, padding: '0' }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
