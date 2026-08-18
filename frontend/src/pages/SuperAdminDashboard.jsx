import React from 'react';

const Dashboard = () => {
  // KPI Data
  const kpis = [
    {
      label: 'Total Companies',
      value: '1,248',
      change: '+12.5%',
      positive: true,
      sparkline: [30, 45, 35, 50, 48, 60, 55, 70, 65, 80, 75, 90]
    },
    {
      label: 'Active Users',
      value: '3,842',
      change: '+8.2%',
      positive: true,
      sparkline: [40, 35, 50, 45, 55, 52, 60, 58, 65, 70, 68, 75]
    },
    {
      label: 'Pending Invoices',
      value: '156',
      change: '-3.1%',
      positive: false,
      sparkline: [60, 55, 65, 58, 50, 52, 48, 45, 50, 42, 40, 38]
    },
    {
      label: 'Revenue',
      value: '$284.5K',
      change: '+18.7%',
      positive: true,
      sparkline: [20, 30, 28, 40, 45, 42, 55, 60, 58, 70, 75, 85]
    }
  ];

  // Bar chart data
  const monthlyData = [
    { month: 'Jan', value: 18500 },
    { month: 'Feb', value: 22000 },
    { month: 'Mar', value: 19800 },
    { month: 'Apr', value: 24500 },
    { month: 'May', value: 28000 },
    { month: 'Jun', value: 25600 },
    { month: 'Jul', value: 31000 },
    { month: 'Aug', value: 29400 },
    { month: 'Sep', value: 33000 },
    { month: 'Oct', value: 35000 },
    { month: 'Nov', value: 32000 },
    { month: 'Dec', value: 38000 }
  ];
  const maxVal = Math.max(...monthlyData.map(d => d.value));

  // Recent companies
  const companies = [
    { name: 'Acme Corp', industry: 'Technology', status: 'Active', revenue: '$45,200', date: 'Jan 12, 2026', contacts: 24 },
    { name: 'Globex Inc', industry: 'Finance', status: 'Active', revenue: '$82,100', date: 'Jan 15, 2026', contacts: 38 },
    { name: 'Initech Labs', industry: 'Software', status: 'Pending', revenue: '$31,400', date: 'Jan 18, 2026', contacts: 12 },
    { name: 'Hooli Health', industry: 'Healthcare', status: 'Active', revenue: '$67,800', date: 'Jan 22, 2026', contacts: 45 },
    { name: 'Pied Piper', industry: 'Technology', status: 'Inactive', revenue: '$19,300', date: 'Jan 28, 2026', contacts: 8 },
    { name: 'Stark Industries', industry: 'Manufacturing', status: 'Active', revenue: '$124,600', date: 'Feb 02, 2026', contacts: 67 },
  ];

  // Sparkline SVG helper
  const renderSparkline = (data, color) => {
    const w = 80, h = 28, pad = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    const areaPoints = `${pad},${h} ${points} ${w - pad},${h}`;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#sg-${color})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  };

  // Status badge color
  const statusStyle = (status) => {
    switch (status) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' };
      case 'Pending': return { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' };
      case 'Inactive': return { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' };
      default: return { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' };
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .dash-root * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        .dash-card {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          transition: box-shadow 0.15s;
        }
        .dash-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        .dash-table-row {
          transition: background 0.1s;
        }
        .dash-table-row:hover {
          background: #f9fafb;
        }

        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-anim-1 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .dash-anim-2 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.06s forwards; opacity: 0; }
        .dash-anim-3 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.12s forwards; opacity: 0; }
        .dash-anim-4 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.18s forwards; opacity: 0; }
        .dash-anim-5 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.24s forwards; opacity: 0; }
        .dash-anim-6 { animation: dashFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.3s forwards; opacity: 0; }
      `}</style>

      <div className="dash-root" style={{ padding: '28px 32px', background: '#fafbfc', minHeight: '100vh' }}>

        {/* ── PAGE HEADER ── */}
        <div className="dash-anim-1" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '12.5px', color: '#9ca3af', margin: '3px 0 0', fontWeight: 400 }}>
            Overview of your business performance
          </p>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="dash-anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          {kpis.map((kpi, i) => {
            const colors = ['#2563eb', '#7c3aed', '#f59e0b', '#10b981'];
            const color = colors[i];
            return (
              <div key={kpi.label} className="dash-card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.02em', marginBottom: '8px' }}>
                      {kpi.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827', letterSpacing: '-0.03em' }}>
                        {kpi.value}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: kpi.positive ? '#16a34a' : '#dc2626',
                        background: kpi.positive ? '#f0fdf4' : '#fef2f2',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        letterSpacing: '0.01em'
                      }}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    {renderSparkline(kpi.sparkline, color)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', marginBottom: '20px' }}>

          {/* Bar Chart */}
          <div className="dash-card dash-anim-3" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Revenue Overview</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Monthly revenue for 2026</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['6M', '1Y', 'All'].map((tab, i) => (
                  <button key={tab} style={{
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    fontWeight: i === 1 ? 600 : 500,
                    color: i === 1 ? '#2563eb' : '#9ca3af',
                    background: i === 1 ? '#eff6ff' : 'transparent',
                    border: '1px solid',
                    borderColor: i === 1 ? '#bfdbfe' : 'transparent',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    letterSpacing: '0.02em'
                  }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Bar Chart */}
            <svg width="100%" height="200" viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => {
                const y = 10 + i * 42;
                const val = maxVal - (i / 4) * maxVal;
                return (
                  <g key={i}>
                    <line x1="40" y1={y} x2="510" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x="35" y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="9" fontWeight="500">
                      {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {monthlyData.map((d, i) => {
                const barW = 28;
                const gap = (510 - 40) / 12;
                const x = 40 + i * gap + (gap - barW) / 2;
                const barH = (d.value / maxVal) * 168;
                const y = 178 - barH;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barW} height={barH} rx="4" fill="url(#barGrad)" opacity={i === 11 ? 1 : 0.75} />
                    <text x={x + barW / 2} y="195" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="500">
                      {d.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right summary panel */}
          <div className="dash-card dash-anim-4" style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em', marginBottom: '4px' }}>
              Company Distribution
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '18px' }}>
              By industry sector
            </div>

            {/* Donut chart */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="#f3f4f6" strokeWidth="18" />
                {/* Technology - 35% */}
                <circle cx="70" cy="70" r="52" fill="none" stroke="#2563eb" strokeWidth="18"
                  strokeDasharray={`${0.35 * 326.7} ${326.7}`} strokeDashoffset="0"
                  transform="rotate(-90 70 70)" strokeLinecap="round" />
                {/* Finance - 25% */}
                <circle cx="70" cy="70" r="52" fill="none" stroke="#7c3aed" strokeWidth="18"
                  strokeDasharray={`${0.25 * 326.7} ${326.7}`} strokeDashoffset={`${-0.35 * 326.7}`}
                  transform="rotate(-90 70 70)" strokeLinecap="round" />
                {/* Healthcare - 20% */}
                <circle cx="70" cy="70" r="52" fill="none" stroke="#10b981" strokeWidth="18"
                  strokeDasharray={`${0.20 * 326.7} ${326.7}`} strokeDashoffset={`${-(0.35 + 0.25) * 326.7}`}
                  transform="rotate(-90 70 70)" strokeLinecap="round" />
                {/* Manufacturing - 12% */}
                <circle cx="70" cy="70" r="52" fill="none" stroke="#f59e0b" strokeWidth="18"
                  strokeDasharray={`${0.12 * 326.7} ${326.7}`} strokeDashoffset={`${-(0.35 + 0.25 + 0.20) * 326.7}`}
                  transform="rotate(-90 70 70)" strokeLinecap="round" />
                {/* Other - 8% */}
                <circle cx="70" cy="70" r="52" fill="none" stroke="#e5e7eb" strokeWidth="18"
                  strokeDasharray={`${0.08 * 326.7} ${326.7}`} strokeDashoffset={`${-(0.35 + 0.25 + 0.20 + 0.12) * 326.7}`}
                  transform="rotate(-90 70 70)" strokeLinecap="round" />
                <text x="70" y="66" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="700">1,248</text>
                <text x="70" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="500">Total</text>
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Technology', pct: '35%', color: '#2563eb' },
                { label: 'Finance', pct: '25%', color: '#7c3aed' },
                { label: 'Healthcare', pct: '20%', color: '#10b981' },
                { label: 'Manufacturing', pct: '12%', color: '#f59e0b' },
                { label: 'Other', pct: '8%', color: '#e5e7eb' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COMPANIES TABLE ── */}
        <div className="dash-card dash-anim-5" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f5f5f5' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Recent Companies</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Last 30 days activity</div>
            </div>
            <button style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#2563eb',
              background: '#eff6ff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 0.12s',
              letterSpacing: '0.01em'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
            >
              View all
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafbfc' }}>
                {['Company', 'Industry', 'Status', 'Revenue', 'Contacts', 'Created'].map(h => (
                  <th key={h} style={{
                    padding: '10px 24px',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    color: '#9ca3af',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    textAlign: h === 'Revenue' || h === 'Contacts' ? 'right' : 'left',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => {
                const st = statusStyle(c.status);
                return (
                  <tr key={i} className="dash-table-row">
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px',
                          background: `linear-gradient(135deg, ${['#2563eb','#7c3aed','#10b981','#f59e0b','#ec4899','#6366f1'][i]}, ${['#3b82f6','#8b5cf6','#34d399','#fbbf24','#f472b6','#818cf8'][i]})`,
                          borderRadius: '7px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>
                          {c.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: '12px', color: '#6b7280', fontWeight: 450, borderBottom: '1px solid #f5f5f5' }}>
                      {c.industry}
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px', borderRadius: '5px',
                        background: st.bg, fontSize: '10.5px', fontWeight: 600, color: st.color
                      }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                        {c.status}
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#111827', textAlign: 'right', borderBottom: '1px solid #f5f5f5' }}>
                      {c.revenue}
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: '12px', color: '#6b7280', textAlign: 'right', borderBottom: '1px solid #f5f5f5' }}>
                      {c.contacts}
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: '11.5px', color: '#9ca3af', borderBottom: '1px solid #f5f5f5' }}>
                      {c.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;