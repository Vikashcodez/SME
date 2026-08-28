import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

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

        .crm-header * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        @keyframes crmDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .crm-dropdown {
          animation: crmDropIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        .crm-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: #6b7280;
          transition: color 0.12s;
        }
        .crm-hamburger:hover { color: #374151; }

        @media (max-width: 1024px) {
          .crm-hamburger { display: flex; }
        }
      `}</style>

      <header
        className="crm-header"
        style={{
          height: '56px',
          background: '#ffffff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleSidebar} className="crm-hamburger">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="4.5" x2="15" y2="4.5" />
              <line x1="3" y1="9" x2="15" y2="9" />
              <line x1="3" y1="13.5" x2="15" y2="13.5" />
            </svg>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ecfdf5',
            border: '1px solid #d1fae5',
            borderRadius: '20px',
            padding: '3px 10px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#065f46',
              letterSpacing: '0.01em'
            }}>
              {user?.branch_name ? `Branch: ${user.branch_name}` : 'Branch Portal'} {user?.branch_code ? `(${user.branch_code})` : ''}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live Date & Time */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingRight: '12px',
            borderRight: '1px solid #f3f4f6'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{dateStr}</span>
              <span style={{ color: '#d1d5db' }}>•</span>
              <span style={{
                fontVariantNumeric: 'tabular-nums',
                color: '#111827',
                fontWeight: 600
              }}>
                {timeStr}<span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '2px' }}>:{secStr} {ampm}</span>
              </span>
            </div>
          </div>

          {/* User Profile */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: dropdownOpen ? '#f9fafb' : 'transparent',
                border: '1px solid',
                borderColor: dropdownOpen ? '#e5e7eb' : '#f3f4f6',
                borderRadius: '8px',
                padding: '4px 10px 4px 6px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {user?.first_name?.charAt(0)?.toUpperCase() || 'B'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', lineHeight: '1.2' }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Branch Admin'}
                </div>
                <div style={{ fontSize: '10px', color: '#059669', fontWeight: 500 }}>
                  Branch Admin
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="crm-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  width: '240px',
                  background: '#ffffff',
                  border: '1px solid #f0f0f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  padding: '6px',
                  zIndex: 100
                }}
              >
                <div style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #f9fafb',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', wordBreak: 'break-all' }}>
                    {user?.email}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <span style={{
                      fontSize: '9.5px',
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      Branch Admin
                    </span>
                    {user?.branch_code && (
                      <span style={{
                        fontSize: '9.5px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {user.branch_code}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.12s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
