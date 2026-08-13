import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiArrowRight, FiShield } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [now, setNow] = useState(new Date());
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
  };

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timeStr = `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif&display=swap');

        .fin-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to { opacity:1; }
        }
        @keyframes spin {
          to { transform:rotate(360deg); }
        }

        .fin-up { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fin-up-1 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s forwards; opacity:0; }
        .fin-up-2 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s forwards; opacity:0; }
        .fin-up-3 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s forwards; opacity:0; }
        .fin-up-4 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s forwards; opacity:0; }
        .fin-up-5 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.25s forwards; opacity:0; }
        .fin-fade { animation: fadeIn 0.7s ease 0.12s forwards; opacity:0; }

        .fin-input-wrap { position: relative; }
        .fin-input-wrap::after {
          content:'';
          position:absolute; bottom:0; left:0;
          width:100%; height:2px;
          background: #059669;
          border-radius: 0 0 10px 10px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .fin-input-wrap.focused::after { transform: scaleX(1); }

        .fin-input {
          width:100%;
          padding: 13px 14px 13px 46px;
          background: #f8faf9;
          border: 1.5px solid #e4e8eb;
          border-radius: 10px;
          font-size: 14px;
          color: #1a2332;
          outline: none;
          transition: all 0.25s ease;
        }
        .fin-input:focus {
          background: #fff;
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.06);
        }
        .fin-input::placeholder { color: #a0aab4; }

        .fin-btn {
          position:relative; overflow:hidden;
          width:100%; padding:14px 28px;
          background: #059669;
          border:none; border-radius:10px;
          color:#fff; font-weight:600; font-size:14px;
          letter-spacing:0.02em; cursor:pointer;
          transition: all 0.25s ease;
        }
        .fin-btn:hover {
          background: #047857;
          box-shadow: 0 6px 20px -4px rgba(5,150,105,0.35);
          transform: translateY(-1px);
        }
        .fin-btn:active { transform:translateY(0); }
        .fin-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none !important; }

        @media (max-width: 960px) {
          .fin-left { display:none !important; }
          .fin-right { width:100% !important; }
        }
      `}</style>

      <div className="fin-root" style={{ minHeight:'100vh', display:'flex' }}>

        {/* ── LEFT PANEL ── */}
        <div
          className="fin-left"
          style={{
            width:'46%',
            minHeight:'100vh',
            background:'#0f172a',
            display:'flex',
            flexDirection:'column',
            justifyContent:'center',
            alignItems:'center',
            position:'relative',
            overflow:'hidden',
            padding:'48px'
          }}
        >
          {/* Subtle gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 40%, rgba(5,150,105,0.06) 0%, transparent 60%)', pointerEvents:'none' }} />

          {/* Top edge line */}
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'1px', background:'linear-gradient(90deg, transparent 10%, rgba(5,150,105,0.15) 50%, transparent 90%)' }} />

          <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:'320px' }}>

            {/* Brand */}
            <div className="fin-up" style={{ marginBottom:'52px' }}>
              <div style={{ width:'52px', height:'52px', margin:'0 auto 22px', background:'#059669', borderRadius:'13px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(5,150,105,0.25)' }}>
                <FiShield style={{ color:'#fff', fontSize:'22px' }} />
              </div>
              <div>
                <span style={{ fontFamily:"'Instrument Serif', serif", fontSize:'36px', fontWeight:400, color:'#fff', letterSpacing:'-0.02em' }}>Tectum</span>
                <span style={{ fontFamily:"'Instrument Serif', serif", fontSize:'36px', fontWeight:400, color:'#34d399', letterSpacing:'-0.02em', marginLeft:'5px' }}>SME</span>
              </div>
              <div style={{ marginTop:'12px', fontSize:'11px', color:'rgba(255,255,255,0.2)', letterSpacing:'0.18em', textTransform:'uppercase', fontWeight:500 }}>
                Financial Management Platform
              </div>
            </div>

            {/* Divider */}
            <div className="fin-up-1" style={{ width:'32px', height:'1px', background:'#059669', margin:'0 auto 52px', opacity:0.4 }} />

            {/* Quote */}
            <div className="fin-up-2" style={{ marginBottom:'52px' }}>
              <p style={{ fontFamily:"'Instrument Serif', serif", fontSize:'19px', color:'rgba(255,255,255,0.5)', lineHeight:1.7, fontStyle:'italic' }}>
                "Precision in finance,<br/>clarity in management."
              </p>
            </div>

            {/* Trust indicators */}
            <div className="fin-up-3" style={{ display:'flex', justifyContent:'center', gap:'32px' }}>
              {[
                { v: 'SOC 2', l: 'Certified' },
                { v: 'ISO', l: '27001' },
                { v: 'GDPR', l: 'Compliant' }
              ].map(item => (
                <div key={item.l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#34d399', letterSpacing:'0.04em' }}>{item.v}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'3px', letterSpacing:'0.06em', textTransform:'uppercase' }}>{item.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom edge line */}
          <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'1px', background:'linear-gradient(90deg, transparent 10%, rgba(5,150,105,0.1) 50%, transparent 90%)' }} />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="fin-right"
          style={{
            width:'54%',
            minHeight:'100vh',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            background:'#fafbfa',
            position:'relative',
            padding:'32px'
          }}
        >
          {/* ── CLOCK — top right corner ── */}
          <div className="fin-fade" style={{ position:'absolute', top:'28px', right:'32px', display:'flex', alignItems:'center', gap:'14px', zIndex:10 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'17px', fontWeight:600, color:'#1e293b', letterSpacing:'0.01em', fontVariantNumeric:'tabular-nums' }}>
                {timeStr}
              </div>
              <div style={{ fontSize:'11px', color:'#94a3b8', letterSpacing:'0.03em', fontWeight:500 }}>
                {dateStr}
              </div>
            </div>
          </div>

          {/* Form container */}
          <div style={{ width:'100%', maxWidth:'380px' }}>

            {/* Badge */}
            <div className="fin-up-1" style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'5px 13px', background:'rgba(5,150,105,0.06)', borderRadius:'100px', marginBottom:'22px' }}>
              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#059669' }} />
              <span style={{ fontSize:'10px', fontWeight:600, color:'#047857', letterSpacing:'0.07em', textTransform:'uppercase' }}>Secure Login</span>
            </div>

            {/* Heading */}
            <h2 className="fin-up-2" style={{ fontSize:'28px', fontWeight:800, color:'#0f172a', letterSpacing:'-0.03em', lineHeight:1.2, marginBottom:'6px' }}>
              Welcome back
            </h2>
            <p className="fin-up-2" style={{ fontSize:'14px', color:'#64748b', marginBottom:'32px', lineHeight:1.5 }}>
              Sign in to your account to continue
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

              {/* Email */}
              <div className="fin-up-3">
                <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#475569', marginBottom:'6px', letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  Email
                </label>
                <div className={`fin-input-wrap ${focusedField === 'email' ? 'focused' : ''}`}>
                  <div style={{ position:'absolute', top:'50%', left:'15px', transform:'translateY(-50%)', color: focusedField === 'email' ? '#059669' : '#94a3b8', transition:'color 0.25s', display:'flex', alignItems:'center', pointerEvents:'none', zIndex:2 }}>
                    <FiMail style={{ fontSize:'16px' }} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="fin-input"
                    placeholder="admin@gmail.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="fin-up-4">
                <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#475569', marginBottom:'6px', letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  Password
                </label>
                <div className={`fin-input-wrap ${focusedField === 'password' ? 'focused' : ''}`}>
                  <div style={{ position:'absolute', top:'50%', left:'15px', transform:'translateY(-50%)', color: focusedField === 'password' ? '#059669' : '#94a3b8', transition:'color 0.25s', display:'flex', alignItems:'center', pointerEvents:'none', zIndex:2 }}>
                    <FiLock style={{ fontSize:'16px' }} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="fin-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="fin-up-5" style={{ paddingTop:'6px' }}>
                <button type="submit" disabled={loading} className="fin-btn" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  {loading ? (
                    <div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <FiArrowRight style={{ fontSize:'15px' }} />
                    </>
                  )}
                </button>
              </div>
            </form> 

            {/* Footer */}
            <div style={{ marginTop:'24px', textAlign:'center' }}>
              <p style={{ fontSize:'10px', color:'#94a3b8', letterSpacing:'0.02em' }}>© 2026 Tectum SME. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;