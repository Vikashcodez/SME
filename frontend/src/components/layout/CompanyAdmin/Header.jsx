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
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
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
        <div style={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
          <button onClick={toggleSidebar} className="crm-hamburger">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="4.5" x2="15" y2="4.5" />
              <line x1="3" y1="9" x2="15" y2="9" />
              <line x1="3" y1="13.5" x2="15" y2="13.5" />
            </svg>
          </button>
        </div>

        {/* CENTER: Clock */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1px',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <span style={{
              fontSize: '22px',
              fontWeight: 600,
              color: '#111827',
              letterSpacing: '-0.03em'
            }}>
              {timeStr}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#c7cdd5',
              letterSpacing: '-0.01em'
            }}>
              :{secStr}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#6b7280',
              marginLeft: '6px',
              letterSpacing: '0.06em'
            }}>
              {ampm}
            </span>
          </div>
          <span style={{
            fontSize: '10.5px',
            color: '#9ca3af',
            fontWeight: 400,
            marginTop: '2px',
            letterSpacing: '0.02em'
          }}>
            {dateStr}
          </span>
        </div>

        {/* RIGHT: Notification + Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '120px',
          justifyContent: 'flex-end'
        }}>

          <button
            style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '6px', transition: 'background 0.12s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div style={{
              position: 'absolute', top: '5px', right: '5px',
              width: '5px', height: '5px', background: '#ef4444',
              borderRadius: '50%', border: '1.5px solid #fff'
            }} />
          </button>

          <div style={{ width: '1px', height: '24px', background: '#f0f0f0' }} />

          {/* Avatar + Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                background: dropdownOpen ? '#f9fafb' : 'none',
                border: 'none', cursor: 'pointer',
                padding: '4px 6px 4px 4px', borderRadius: '8px',
                transition: 'background 0.12s'
              }}
              onMouseEnter={(e) => { if (!dropdownOpen) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'none'; }}
            >
              <div style={{
                width: '30px', height: '30px',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontSize: '12px', fontWeight: 500, color: '#1f2937',
                  margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px'
                }}>
                  {user?.email || 'Admin'}
                </p>
                <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0, lineHeight: 1.3, fontWeight: 500 }}>
                  Super Admin
                </p>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  marginLeft: '2px', transition: 'transform 0.15s',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="crm-dropdown" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: '220px', background: '#fff',
                border: '1px solid #f0f0f0', borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden', zIndex: 100
              }}>
                <div style={{ padding: '14px 16px', background: '#fafbfc', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px', height: '34px',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0
                    }}>
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '12px', fontWeight: 600, color: '#111827',
                        margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {user?.email || 'Admin'}
                      </p>
                      <p style={{ fontSize: '10.5px', color: '#6b7280', margin: 0, lineHeight: 1.3, fontWeight: 500 }}>
                        Super Admin
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '6px 8px' }}>
                  <button
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', transition: 'background 0.1s',
                      fontSize: '12px', fontWeight: 500, color: '#374151', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.57l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.57-.33 1.65 1.65 0 0 0-1 1.32V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.57.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.32-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.57l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.32V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.32 1.65 1.65 0 0 0 1.57-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.32 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.32 1z" />
                    </svg>
                    Settings
                  </button>
                </div>

                <div style={{ padding: '6px 8px', borderTop: '1px solid #f3f4f6' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', transition: 'all 0.1s',
                      fontSize: '12px', fontWeight: 500, color: '#6b7280', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
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