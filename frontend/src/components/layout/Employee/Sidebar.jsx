import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Logo from '../../../assets/logo.png';
import {
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  Users,
  BellRing,
  User,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Briefcase
} from 'lucide-react';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const menuSections = [
    {
      label: 'Main Portal',
      items: [
        { path: '/employee-dashboard', label: 'My Dashboard', icon: LayoutDashboard, exact: true },
        { path: '/employee-dashboard#attendance', label: 'Shift & Attendance', icon: CalendarCheck },
        { path: '/employee-dashboard#tasks', label: 'My Action Items', icon: CheckSquare, badge: 'Active' },
      ]
    },
    {
      label: 'Workplace',
      items: [
        { path: '/employee-dashboard#directory', label: 'Branch Directory', icon: Users },
        { path: '/employee-dashboard#notices', label: 'Notice Board', icon: BellRing },
      ]
    },
    {
      label: 'Account & Service',
      items: [
        { path: '/employee-dashboard#profile', label: 'Profile & Identity', icon: User },
        { path: '/employee-dashboard#support', label: 'Staff Support', icon: HelpCircle },
      ]
    }
  ];

  const sidebarWidth = isCollapsed ? 64 : 240;

  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .emp-sidebar * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        .emp-sidebar::-webkit-scrollbar { width: 0; }

        .emp-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          height: 36px;
          border-radius: 8px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.15s ease;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          position: relative;
          cursor: pointer;
        }
        .emp-nav-link:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .emp-nav-link.active {
          color: #0284c7;
          background: #f0f9ff;
          font-weight: 600;
        }
        .emp-nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background: #0284c7;
          border-radius: 0 3px 3px 0;
        }

        .emp-nav-link-collapsed {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .emp-nav-link-collapsed:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .emp-nav-link-collapsed.active {
          color: #0284c7;
          background: #f0f9ff;
        }

        .emp-tip-wrap { position: relative; }
        .emp-tip-wrap .emp-tip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          background: #0f172a;
          color: #f8fafc;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 200;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .emp-tip-wrap .emp-tip::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: #0f172a;
        }
        .emp-tip-wrap:hover .emp-tip { opacity: 1; }

        .emp-search {
          width: 100%;
          padding: 7px 11px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 12px;
          font-weight: 400;
          outline: none;
          transition: all 0.15s ease;
        }
        .emp-search:focus {
          background: #ffffff;
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56,189,248,0.12);
        }
        .emp-search::placeholder { color: #94a3b8; }
      `}</style>

      <aside
        className="emp-sidebar"
        style={{
          width: sidebarWidth,
          minHeight: '100vh',
          background: '#ffffff',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
          borderRight: '1px solid #e2e8f0'
        }}
      >
        {/* Top Sky Accent Line */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #06b6d4 100%)',
          flexShrink: 0
        }} />

        {/* Brand Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          height: '56px',
          minHeight: '56px',
          maxHeight: '56px',
          flexShrink: 0,
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            overflow: 'hidden',
            flex: 1,
            minWidth: 0
          }}>
            <img
              src={Logo}
              alt="Tectum SME"
              style={{
                width: '30px',
                height: '30px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap'
                  }}>
                    Tectum<span style={{ color: '#0284c7' }}>Staff</span>
                  </span>
                </div>
                <span style={{
                  fontSize: '10.5px',
                  color: '#64748b',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user?.department ? `${user.department}` : 'Employee Portal'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              transition: 'all 0.12s',
              padding: 0,
              flexShrink: 0
            }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div style={{ padding: '12px 14px 6px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="emp-search"
              placeholder="Search portal..."
            />
          </div>
        )}

        {/* User Card (Expanded Mode) */}
        {!isCollapsed && (
          <div style={{
            margin: '8px 12px 6px',
            padding: '10px 12px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(2,132,199,0.25)',
              flexShrink: 0
            }}>
              {user?.first_name?.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Staff Member'}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 600,
                color: '#0369a1',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.role || 'Staff Member'}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filteredSections.map((section, sIdx) => (
            <div key={section.label} style={{ marginBottom: '8px' }}>
              {!isCollapsed ? (
                <div style={{
                  padding: '6px 16px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {section.label}
                </div>
              ) : (
                sIdx > 0 && (
                  <div style={{ margin: '6px 12px', height: '1px', background: '#f1f5f9' }} />
                )
              )}

              <ul style={{
                listStyle: 'none',
                margin: 0,
                padding: isCollapsed ? '0 10px' : '0 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      {isCollapsed ? (
                        <div className="emp-tip-wrap">
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              `emp-nav-link-collapsed${isActive ? ' active' : ''}`
                            }
                          >
                            <Icon size={18} />
                          </NavLink>
                          <div className="emp-tip">{item.label}</div>
                        </div>
                      ) : (
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `emp-nav-link${isActive ? ' active' : ''}`
                          }
                        >
                          <Icon size={16} className="shrink-0" />
                          <span style={{
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.label}
                          </span>
                          {item.badge && (
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              color: '#0284c7',
                              background: '#e0f2fe',
                              padding: '1.5px 6px',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — Employee Code & Branch Meta */}
        <div style={{
          padding: '12px 14px',
          marginTop: 'auto',
          borderTop: '1px solid #f1f5f9',
          background: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}>
          {!isCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2.5px 7px',
                borderRadius: '6px',
                fontFamily: 'monospace'
              }}>
                {user?.employee_code || 'EMP-STAFF'}
              </span>
              <span style={{
                fontSize: '10.5px',
                color: '#64748b',
                fontWeight: 500,
                truncate: true
              }}>
                {user?.branch_name || user?.company_name || 'Active Desk'}
              </span>
            </div>
          ) : (
            <span style={{
              fontSize: '10px',
              color: '#94a3b8',
              fontWeight: 700
            }}>
              •
            </span>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
