import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiArrowRight, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .crm-root * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }

        @keyframes crmSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes crmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes crmSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes crmPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .crm-up-0 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .crm-up-1 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s forwards; opacity: 0; }
        .crm-up-2 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s forwards; opacity: 0; }
        .crm-up-3 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s forwards; opacity: 0; }
        .crm-up-4 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s forwards; opacity: 0; }
        .crm-up-5 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.25s forwards; opacity: 0; }
        .crm-up-6 { animation: crmSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s forwards; opacity: 0; }
        .crm-fade { animation: crmFadeIn 0.7s ease 0.2s forwards; opacity: 0; }

        .crm-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          background: #fff;
          border: 1.5px solid #d1d5db;
          border-radius: 7px;
          font-size: 13px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .crm-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .crm-input::placeholder { color: #9ca3af; }

        .crm-input-pw {
          width: 100%;
          padding: 10px 40px 10px 40px;
          background: #fff;
          border: 1.5px solid #d1d5db;
          border-radius: 7px;
          font-size: 13px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .crm-input-pw:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .crm-input-pw::placeholder { color: #9ca3af; }

        .crm-btn {
          width: 100%;
          padding: 10px 24px;
          background: #2563eb;
          border: none;
          border-radius: 7px;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .crm-btn:hover {
          background: #1d4ed8;
          box-shadow: 0 4px 12px -2px rgba(37,99,235,0.45);
        }
        .crm-btn:active { background: #1e40af; }
        .crm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none !important;
        }

        .crm-checkbox {
          appearance: none;
          width: 15px;
          height: 15px;
          border: 1.5px solid #d1d5db;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.12s;
          position: relative;
          flex-shrink: 0;
        }
        .crm-checkbox:checked {
          background: #2563eb;
          border-color: #2563eb;
        }
        .crm-checkbox:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          line-height: 1;
        }

        .crm-link {
          color: #2563eb;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.12s;
        }
        .crm-link:hover { color: #1d4ed8; text-decoration: underline; }

        .crm-sso-btn {
          width: 100%;
          padding: 10px 24px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 7px;
          color: #374151;
          font-weight: 500;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .crm-sso-btn:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        @media (max-width: 960px) {
          .crm-left { display: none !important; }
          .crm-right { width: 100% !important; }
          .crm-mobile-logo { display: flex !important; }
        }
      `}</style>

      <div className="crm-root" style={{ minHeight: '100vh', display: 'flex' }}>

        {/* ═══ LEFT PANEL ═══ */}
        <div
          className="crm-left"
          style={{
            width: '48%',
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #1e3a5f 0%, #132d4d 35%, #0c1f36 70%, #091528 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            padding: '44px 40px'
          }}
        >
          {/* Dot grid pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.025,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none'
          }} />

          {/* Blue glow orb */}
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%)',
            pointerEvents: 'none'
          }} />

          {/* Secondary glow */}
          <div style={{
            position: 'absolute', bottom: '10%', right: '-10%',
            width: '350px', height: '350px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          {/* Top: Logo */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="crm-up-0" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '32px', height: '32px', background: '#2563eb', borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
              }}>
                <FiShield style={{ color: '#fff', fontSize: '14px' }} />
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Tectum</span>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.02em' }}>SME</span>
            </div>
          </div>

          {/* Center: Dashboard Illustration */}
          <div className="crm-fade" style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center' }}>
            <svg width="320" height="240" viewBox="0 0 320 240" fill="none" style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.35))' }}>
              {/* Main card */}
              <rect x="10" y="16" width="300" height="208" rx="10" fill="#132d4d" stroke="rgba(37,99,235,0.12)" strokeWidth="0.75" />

              {/* Top header bar */}
              <rect x="10" y="16" width="300" height="28" rx="10" fill="#1a3a5c" />
              <rect x="10" y="34" width="300" height="10" fill="#1a3a5c" />

              {/* Window dots */}
              <circle cx="28" cy="30" r="3.5" fill="#ef4444" opacity="0.65" />
              <circle cx="40" cy="30" r="3.5" fill="#f59e0b" opacity="0.65" />
              <circle cx="52" cy="30" r="3.5" fill="#22c55e" opacity="0.65" />

              {/* Tab bar */}
              <rect x="70" y="24" width="40" height="14" rx="3" fill="rgba(37,99,235,0.15)" />
              <rect x="76" y="29" width="28" height="4" rx="2" fill="#60a5fa" opacity="0.5" />
              <rect x="115" y="24" width="40" height="14" rx="3" fill="transparent" />
              <rect x="121" y="29" width="28" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
              <rect x="160" y="24" width="40" height="14" rx="3" fill="transparent" />
              <rect x="166" y="29" width="28" height="4" rx="2" fill="rgba(255,255,255,0.12)" />

              {/* KPI Stat Cards Row */}
              <rect x="24" y="54" width="82" height="44" rx="6" fill="#0f2440" stroke="rgba(37,99,235,0.1)" strokeWidth="0.5" />
              <rect x="112" y="54" width="82" height="44" rx="6" fill="#0f2440" stroke="rgba(37,99,235,0.1)" strokeWidth="0.5" />
              <rect x="200" y="54" width="96" height="44" rx="6" fill="#0f2440" stroke="rgba(37,99,235,0.1)" strokeWidth="0.5" />

              {/* KPI 1 content */}
              <rect x="32" y="62" width="36" height="4" rx="2" fill="#60a5fa" opacity="0.5" />
              <rect x="32" y="72" width="56" height="7" rx="2" fill="#fff" opacity="0.85" />
              <rect x="32" y="84" width="28" height="3.5" rx="1.5" fill="#34d399" opacity="0.5" />

              {/* KPI 2 content */}
              <rect x="120" y="62" width="40" height="4" rx="2" fill="#a78bfa" opacity="0.5" />
              <rect x="120" y="72" width="52" height="7" rx="2" fill="#fff" opacity="0.85" />
              <rect x="120" y="84" width="30" height="3.5" rx="1.5" fill="#f87171" opacity="0.5" />

              {/* KPI 3 content */}
              <rect x="208" y="62" width="44" height="4" rx="2" fill="#fbbf24" opacity="0.5" />
              <rect x="208" y="72" width="60" height="7" rx="2" fill="#fff" opacity="0.85" />
              <rect x="208" y="84" width="32" height="3.5" rx="1.5" fill="#34d399" opacity="0.5" />

              {/* Chart Section */}
              <rect x="24" y="106" width="170" height="72" rx="6" fill="#0f2440" stroke="rgba(37,99,235,0.1)" strokeWidth="0.5" />

              {/* Chart title */}
              <rect x="32" y="114" width="52" height="4" rx="2" fill="rgba(255,255,255,0.3)" />

              {/* Chart grid lines */}
              <line x1="40" y1="130" x2="180" y2="130" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <line x1="40" y1="142" x2="180" y2="142" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <line x1="40" y1="154" x2="180" y2="154" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <line x1="40" y1="166" x2="180" y2="166" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

              {/* Bar chart */}
              <rect x="46" y="152" width="9" height="18" rx="2" fill="#2563eb" opacity="0.7" />
              <rect x="60" y="144" width="9" height="26" rx="2" fill="#2563eb" opacity="0.8" />
              <rect x="74" y="138" width="9" height="32" rx="2" fill="#3b82f6" opacity="0.85" />
              <rect x="88" y="134" width="9" height="36" rx="2" fill="#3b82f6" />
              <rect x="102" y="140" width="9" height="30" rx="2" fill="#3b82f6" opacity="0.85" />
              <rect x="116" y="148" width="9" height="22" rx="2" fill="#2563eb" opacity="0.75" />
              <rect x="130" y="136" width="9" height="34" rx="2" fill="#3b82f6" opacity="0.9" />
              <rect x="144" y="142" width="9" height="28" rx="2" fill="#2563eb" opacity="0.8" />
              <rect x="158" y="150" width="9" height="20" rx="2" fill="#2563eb" opacity="0.65" />

              {/* Line chart overlay */}
              <polyline points="50,148 65,140 79,134 93,130 107,136 121,144 135,132 149,138 163,146"
                fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" strokeLinejoin="round" />
              <circle cx="93" cy="130" r="2.5" fill="#60a5fa" opacity="0.8" />
              <circle cx="135" cy="132" r="2.5" fill="#60a5fa" opacity="0.8" />

              {/* Table Section */}
              <rect x="200" y="106" width="96" height="72" rx="6" fill="#0f2440" stroke="rgba(37,99,235,0.1)" strokeWidth="0.5" />

              {/* Table title */}
              <rect x="208" y="114" width="42" height="4" rx="2" fill="rgba(255,255,255,0.3)" />

              {/* Table header */}
              <rect x="208" y="124" width="80" height="3" rx="1" fill="rgba(255,255,255,0.08)" />

              {/* Table rows */}
              <rect x="208" y="133" width="48" height="3" rx="1" fill="rgba(255,255,255,0.2)" />
              <rect x="264" y="133" width="20" height="3" rx="1" fill="#34d399" opacity="0.45" />

              <rect x="208" y="142" width="40" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x="264" y="142" width="20" height="3" rx="1" fill="#60a5fa" opacity="0.45" />

              <rect x="208" y="151" width="52" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x="264" y="151" width="20" height="3" rx="1" fill="#34d399" opacity="0.45" />

              <rect x="208" y="160" width="36" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x="264" y="160" width="20" height="3" rx="1" fill="#fbbf24" opacity="0.45" />

              <rect x="208" y="169" width="44" height="3" rx="1" fill="rgba(255,255,255,0.12)" />
              <rect x="264" y="169" width="20" height="3" rx="1" fill="#f87171" opacity="0.4" />

              {/* Mini activity feed - bottom row */}
              <rect x="24" y="186" width="134" height="26" rx="5" fill="#0f2440" stroke="rgba(37,99,235,0.08)" strokeWidth="0.5" />
              <circle cx="38" cy="199" r="4" fill="#3b82f6" opacity="0.3" />
              <rect x="48" y="197" width="60" height="3.5" rx="1.5" fill="rgba(255,255,255,0.18)" />
              <rect x="112" y="197" width="30" height="3.5" rx="1.5" fill="rgba(255,255,255,0.08)" />

              <rect x="164" y="186" width="132" height="26" rx="5" fill="#0f2440" stroke="rgba(37,99,235,0.08)" strokeWidth="0.5" />
              <circle cx="178" cy="199" r="4" fill="#34d399" opacity="0.3" />
              <rect x="188" y="197" width="56" height="3.5" rx="1.5" fill="rgba(255,255,255,0.18)" />
              <rect x="250" y="197" width="30" height="3.5" rx="1.5" fill="rgba(255,255,255,0.08)" />
            </svg>
          </div>

          {/* Bottom: Tagline + Trust */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="crm-up-2">
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: '20px', maxWidth: '280px' }}>
                Streamline financial operations with real-time insights and enterprise-grade security.
              </p>
            </div>

            <div className="crm-up-3" style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'SOC 2 Type II' },
                { label: 'ISO 27001' },
                { label: 'GDPR Ready' },
                { label: '256-bit SSL' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', animation: 'crmPulse 2.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 500, letterSpacing: '0.02em' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Edge accent lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(37,99,235,0.12) 50%, transparent 95%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(37,99,235,0.08) 50%, transparent 95%)' }} />
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div
          className="crm-right"
          style={{
            width: '52%',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            position: 'relative',
            padding: '32px 48px'
          }}
        >
          {/* Subtle top-right decorative element */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '300px', height: '300px',
            background: 'radial-gradient(circle at 100% 0%, rgba(37,99,235,0.03) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          <div style={{ width: '100%', maxWidth: '370px', position: 'relative', zIndex: 2 }}>

            {/* Mobile logo (hidden on desktop) */}
            <div className="crm-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
              <div style={{
                width: '28px', height: '28px', background: '#2563eb', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiShield style={{ color: '#fff', fontSize: '12px' }} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>Tectum</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#2563eb' }}>SME</span>
            </div>

            {/* Secure badge */}
            <div className="crm-up-0" style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', background: '#f0f5ff', borderRadius: '100px',
              marginBottom: '20px'
            }}>
              <FiShield style={{ fontSize: '10px', color: '#2563eb' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#2563eb', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Secure Login</span>
            </div>

            {/* Heading */}
            <h2 className="crm-up-1" style={{
              fontSize: '22px', fontWeight: 700, color: '#111827',
              letterSpacing: '-0.02em', marginBottom: '4px', lineHeight: 1.3
            }}>
              Sign in to your account
            </h2>
            <p className="crm-up-1" style={{ fontSize: '13px', color: '#6b7280', marginBottom: '26px', lineHeight: 1.5 }}>
              Enter your credentials to continue
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Email Field */}
              <div className="crm-up-2">
                <label style={{
                  display: 'block', fontSize: '11.5px', fontWeight: 500,
                  color: '#374151', marginBottom: '5px', letterSpacing: '0.01em'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '13px', transform: 'translateY(-50%)',
                    color: focusedField === 'email' ? '#2563eb' : '#9ca3af',
                    transition: 'color 0.15s', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2
                  }}>
                    <FiMail style={{ fontSize: '14px' }} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="crm-input"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="crm-up-3">
                <label style={{
                  display: 'block', fontSize: '11.5px', fontWeight: 500,
                  color: '#374151', marginBottom: '5px', letterSpacing: '0.01em'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '13px', transform: 'translateY(-50%)',
                    color: focusedField === 'password' ? '#2563eb' : '#9ca3af',
                    transition: 'color 0.15s', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2
                  }}>
                    <FiLock style={{ fontSize: '14px' }} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="crm-input-pw"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9ca3af', display: 'flex', alignItems: 'center', padding: '2px',
                      transition: 'color 0.12s', zIndex: 2
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    {showPassword ? <FiEyeOff style={{ fontSize: '14px' }} /> : <FiEye style={{ fontSize: '14px' }} />}
                  </button>
                </div>
              </div>

              {/* Remember Me + Forgot Password */}
              <div className="crm-up-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="crm-checkbox"
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', userSelect: 'none' }}>Keep me signed in</span>
                </label>
                <a className="crm-link" href="#">Forgot password?</a>
              </div>

              {/* Submit Button */}
              <div className="crm-up-5" style={{ paddingTop: '4px' }}>
                <button type="submit" disabled={loading} className="crm-btn">
                  {loading ? (
                    <div style={{
                      width: '15px', height: '15px',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      borderRadius: '50%', animation: 'crmSpin 0.6s linear infinite'
                    }} />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <FiArrowRight style={{ fontSize: '13px' }} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="crm-up-6" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* SSO Button */}
            <div className="crm-up-6">
              <button type="button" className="crm-sso-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.98-2.1 5.39z" fill="#9ca3af" />
                </svg>
                <span>Continue with SSO</span>
              </button>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                © 2026 Tectum SME. All rights reserved.
              </p>
              <div style={{ display: 'flex', gap: '14px' }}>
                <a className="crm-link" href="#" style={{ fontSize: '10.5px' }}>Privacy Policy</a>
                <a className="crm-link" href="#" style={{ fontSize: '10.5px' }}>Terms of Service</a>
                <a className="crm-link" href="#" style={{ fontSize: '10.5px' }}>Help Center</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;