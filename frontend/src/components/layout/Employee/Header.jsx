import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Menu, 
  LogOut, 
  User, 
  Building, 
  Briefcase, 
  Mail, 
  Phone, 
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronDown
} from 'lucide-react';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timeStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const secStr = String(s).padStart(2, '0');
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .emp-header * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        @keyframes empDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .emp-dropdown {
          animation: empDropIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        .emp-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: #64748b;
          border-radius: 6px;
          transition: color 0.12s, background 0.12s;
        }
        .emp-hamburger:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        @media (max-width: 1024px) {
          .emp-hamburger { display: flex; }
        }
      `}</style>

      <header
        className="emp-header"
        style={{
          height: '56px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        {/* Left Side: Hamburger & Employee Workspace Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleSidebar} className="emp-hamburger">
            <Menu size={20} />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '20px',
            padding: '3px 12px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#0284c7',
              display: 'inline-block'
            }} />
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#0369a1',
              letterSpacing: '0.01em'
            }}>
              {user?.company_name || 'Tectum SME'} {user?.branch_name ? `• ${user.branch_name}` : ''}
            </span>
          </div>

          {user?.department && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              background: '#f1f5f9',
              padding: '3px 10px',
              borderRadius: '6px',
              display: 'none',
              sm: 'inline-block'
            }}>
              Dept: {user.department}
            </span>
          )}
        </div>

        {/* Right Side: Live Clock & Profile Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Live Date & Time Tracker */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingRight: '14px',
            borderRight: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{dateStr}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{
                fontVariantNumeric: 'tabular-nums',
                color: '#0f172a',
                fontWeight: 700
              }}>
                {timeStr}
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '3px' }}>
                  :{secStr} {ampm}
                </span>
              </span>
            </div>
          </div>

          {/* User Profile Pill */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: dropdownOpen ? '#f8fafc' : 'transparent',
                border: '1px solid',
                borderColor: dropdownOpen ? '#cbd5e1' : '#e2e8f0',
                borderRadius: '8px',
                padding: '4px 10px 4px 6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: '0 2px 5px rgba(2,132,199,0.2)'
              }}>
                {user?.first_name?.charAt(0)?.toUpperCase() || 'E'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Employee'}
                </div>
                <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>
                  {user?.role || 'Staff Member'}
                </div>
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                className="emp-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  width: '260px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  padding: '8px',
                  zIndex: 100
                }}
              >
                <div style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {user?.first_name} {user?.last_name || ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                    {user?.email}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {user?.employee_code && (
                      <span style={{
                        fontSize: '9.5px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontFamily: 'monospace'
                      }}>
                        {user.employee_code}
                      </span>
                    )}
                    <span style={{
                      fontSize: '9.5px',
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {user?.department || 'Staff'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '4px 0' }}>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      window.location.hash = 'profile';
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.12s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={14} className="text-slate-400" />
                    <span>View Profile</span>
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
