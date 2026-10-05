import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Logo from '../../../assets/logo.png';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const menuSections = [
    {
      label: 'Overview',
      items: [
        { path: '/company-dashboard', label: 'Dashboard' },
        { path: '/branch', label: 'Branches' },
      ]
    },
    {
      label: 'Master Data',
      items: [
        { path: '/roles', label: 'Roles Master' },
        { path: '/departments', label: 'Departments' },
        { path: '/employees', label: 'Employees' },
        { path: '/vendors', label: 'Vendor Master' },
        { path: '/raw-materials', label: 'Raw Material Master' },
        { path: '/products', label: 'Product Master' },
        { path: '/production-masters', label: 'Production Master / BOM' },
      ]
    },
    {
      label: 'Inventory & Production',
      items: [
        { path: '/grn', label: 'Goods Receipt (GRN)' },
        { path: '/raw-material-inventory', label: 'Raw Materials Stock' },
        { path: '/production-orders', label: 'Production Orders' },
        { path: '/quality-checks', label: 'Quality & Rework' },
        { path: '/product-inventory', label: 'Finished Goods Stock' },
        { path: '/assets-inventory', label: 'Assets Inventory' },
      ]
    },
    {
      label: 'Management',
      items: [
        { path: '/users', label: 'Users', badge: 3 },
        { path: '/invoices', label: 'Invoices', badge: 12 },
      ]
    },
    {
      label: 'Insights',
      items: [
        { path: '/reports', label: 'Reports' },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/settings', label: 'Settings' },
      ]
    }
  ];

  const sidebarWidth = isCollapsed ? 62 : 236;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .crm-sidebar * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        .crm-sidebar::-webkit-scrollbar { width: 0; }

        .crm-nav-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .crm-nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .crm-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .crm-nav-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .crm-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .crm-nav-link {
          display: flex;
          align-items: center;
          padding: 0 14px;
          height: 33px;
          border-radius: 6px;
          color: #6b7280;
          text-decoration: none;
          transition: color 0.12s, background 0.12s;
          font-size: 12.5px;
          font-weight: 450;
          letter-spacing: 0.01em;
          position: relative;
          cursor: pointer;
        }
        .crm-nav-link:hover {
          color: #374151;
          background: #f9fafb;
        }
        .crm-nav-link.active {
          color: #1d4ed8;
          background: #eff6ff;
          font-weight: 600;
        }
        .crm-nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 9px;
          bottom: 9px;
          width: 2.5px;
          background: #2563eb;
          border-radius: 2px;
        }

        .crm-nav-link-collapsed {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 33px;
          border-radius: 6px;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.12s, background 0.12s;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
        }
        .crm-nav-link-collapsed:hover {
          color: #6b7280;
          background: #f9fafb;
        }
        .crm-nav-link-collapsed.active {
          color: #2563eb;
          background: #eff6ff;
        }

        .crm-tip-wrap { position: relative; }
        .crm-tip-wrap .crm-tip {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1e293b;
          color: #f1f5f9;
          padding: 4px 9px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.12s;
          z-index: 200;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .crm-tip-wrap .crm-tip::before {
          content: '';
          position: absolute;
          left: -3px;
          top: 50%;
          transform: translateY(-50%) rotate(45deg);
          width: 6px;
          height: 6px;
          background: #1e293b;
        }
        .crm-tip-wrap:hover .crm-tip { opacity: 1; }

        .crm-search {
          width: 100%;
          padding: 7px 11px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 6px;
          color: #111827;
          font-size: 12px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .crm-search:focus {
          background: #fff;
          border-color: #bfdbfe;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.06);
        }
        .crm-search::placeholder { color: #9ca3af; }

        .crm-col-btn {
          background: none;
          border: 1px solid #f3f4f6;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          transition: all 0.12s;
          padding: 0;
          font-size: 13px;
          line-height: 1;
          flex-shrink: 0;
        }
        .crm-col-btn:hover {
          color: #6b7280;
          border-color: #e5e7eb;
          background: #f9fafb;
        }
      `}</style>

      <div
        className="crm-sidebar"
        style={{
          width: sidebarWidth,
          height: '100vh',
          maxHeight: '100vh',
          background: '#ffffff',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
          borderRight: '1px solid #f0f0f0'
        }}
      >
        {/* Top accent line */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 40%, #6366f1 100%)',
          flexShrink: 0
        }} />

        {/* Header — fixed 52px height, never changes */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          height: '52px',
          minHeight: '52px',
          maxHeight: '52px',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            flex: 1,
            minWidth: 0
          }}>
            <img
              src={Logo}
              alt="Tectum SME"
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />
            {!isCollapsed && (
              <span style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}>
                Tectum<span style={{ color: '#2563eb' }}>SME</span>
              </span>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="crm-col-btn"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="crm-search"
              placeholder="Search..."
            />
          </div>
        )}

        {/* Navigation */}
        <nav
          className="crm-nav-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2px 0 20px 0'
          }}
        >
          {menuSections.map((section, sIdx) => (
            <div key={section.label}>
              {!isCollapsed ? (
                <div style={{
                  padding: sIdx === 0 ? '6px 18px 5px' : '14px 18px 5px',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#9ca3af',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase'
                }}>
                  {section.label}
                </div>
              ) : (
                <>
                  {sIdx > 0 && (
                    <div style={{ margin: '6px 14px', height: '1px', background: '#f3f4f6' }} />
                  )}
                </>
              )}

              <ul style={{
                listStyle: 'none',
                margin: 0,
                padding: isCollapsed ? '0 10px' : '0 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px'
              }}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    {isCollapsed ? (
                      <div className="crm-tip-wrap">
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `crm-nav-link-collapsed${isActive ? ' active' : ''}`
                          }
                          title={item.label}
                        >
                          {item.label.charAt(0)}
                        </NavLink>
                        <div className="crm-tip">{item.label}</div>
                      </div>
                    ) : (
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `crm-nav-link${isActive ? ' active' : ''}`
                        }
                      >
                        <span style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0
                        }}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 600,
                            color: '#dc2626',
                            background: '#fef2f2',
                            padding: '1px 6px',
                            borderRadius: '7px',
                            flexShrink: 0,
                            lineHeight: '1.5'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom — version only */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #f5f5f5',
          background: '#ffffff',
          flexShrink: 0,
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'flex-end',
          zIndex: 10
        }}>
          <span style={{
            fontSize: '9px',
            color: '#d1d5db',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
            {isCollapsed ? '·' : 'v2.4'}
          </span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;