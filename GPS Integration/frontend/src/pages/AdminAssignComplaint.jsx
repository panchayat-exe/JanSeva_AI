import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardIcon, ComplaintsIcon, GeoVisionIcon, ProfileIcon, SettingsIcon, LogoutIcon, AshokaStambhaIcon } from '../components/Icons';

function Sidebar({ active }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, href: '/admin' },
    { id: 'complaints', label: 'Complaints', icon: <ComplaintsIcon />, href: '/admin' },
    { id: 'geovision', label: 'GeoVision', icon: <GeoVisionIcon />, href: '/admin' },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon />, href: '#' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, href: '#' },
  ];
  return (
    <aside className="jv-sidebar">
      <div className="jv-sidebar-brand">
        <div className="jv-emblem"><AshokaStambhaIcon width={34} height={34} /></div>
        <div className="jv-brand-text">
          <span className="jv-brand-name">JANSEVA AI</span>
          <span className="jv-brand-tagline">Your Voice. Our Action.</span>
        </div>
      </div>
      <div className="jv-sidebar-divider" />
      <nav className="jv-nav">
        {navItems.map(item => (
          <Link key={item.id} to={item.href} className={`jv-nav-item ${active === item.id ? 'jv-nav-item--active' : ''}`}>
            <span className="jv-nav-icon">{item.icon}</span>
            <span className="jv-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="jv-sidebar-bottom">
        <Link to="/" className="jv-nav-item jv-nav-logout">
          <span className="jv-nav-icon"><LogoutIcon /></span>
          <span className="jv-nav-label">Logout</span>
        </Link>
      </div>
    </aside>
  );
}

function TopBar({ crumbs }) {
  const { i18n } = useTranslation();
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #e8edf2' }}>
      <nav style={{ display: 'flex', gap: '6px', fontSize: '0.875rem', color: '#94a3b8' }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {i > 0 && <span style={{ color: '#cbd5e1' }}>›</span>}
            {c.href ? <Link to={c.href} style={{ color: '#94a3b8', textDecoration: 'none' }}>{c.label}</Link>
              : <span style={{ color: '#0f172a', fontWeight: 600 }}>{c.label}</span>}
          </span>
        ))}
      </nav>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ position: 'relative', cursor: 'pointer', fontSize: '1.1rem' }}>
          🔔 <span style={{ position: 'absolute', top: -4, right: -4, background: '#f97316', color: '#fff', borderRadius: '999px', fontSize: '0.6rem', padding: '1px 4px', fontWeight: 700 }}>3</span>
        </span>
        <select style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', color: '#334155', background: '#fff', cursor: 'pointer' }} onChange={e => i18n.changeLanguage(e.target.value)} defaultValue={i18n.language}>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </select>
      </div>
    </header>
  );
}

const DEPARTMENTS = [
  'Municipal Corporation',
  'Public Works / Roads Department',
  'Water Supply Department',
  'Electrical Department',
  'Sanitation Department',
  'Stormwater Drains Department',
  'Health Department',
  'Fire & Emergency Services',
  'Transport Department',
];

export default function AdminAssignComplaint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engineerName, setEngineerName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/incidents/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setIncident(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Auto-select department based on category
  useEffect(() => {
    if (!incident) return;
    const cat = (incident.category || '').toLowerCase();
    if (cat.includes('water') || cat.includes('leak')) setDepartment('Water Supply Department');
    else if (cat.includes('pothole') || cat.includes('road')) setDepartment('Public Works / Roads Department');
    else if (cat.includes('light') || cat.includes('electric')) setDepartment('Electrical Department');
    else if (cat.includes('garbage') || cat.includes('waste')) setDepartment('Sanitation Department');
    else if (cat.includes('drain')) setDepartment('Stormwater Drains Department');
    else setDepartment('Municipal Corporation');
  }, [incident]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!engineerName || !employeeId || !department) { setError('Please fill in all required fields.'); return; }
    setError('');
    setAssigning(true);
    try {
      const fd = new FormData();
      fd.append('team', engineerName);
      fd.append('department', department);
      const res = await fetch(`/api/incidents/${id}/assign`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const realIncidentId = data.incident_id || id;
        const evFd = new FormData();
        evFd.append('event_type', 'assigned');
        evFd.append('actor', 'admin');
        evFd.append('notes', `Engineer: ${engineerName} | Emp ID: ${employeeId} | Mobile: ${mobileNumber} | Dept: ${department}`);
        await fetch(`/api/incidents/${realIncidentId}/events`, { method: 'POST', body: evFd });
        navigate(`/admin/incident/${realIncidentId}/progress`);
      }
    } catch (err) { console.error(err); } finally { setAssigning(false); }
  };

  if (loading) return <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}><Sidebar active="complaints" /><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div></div>;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active="complaints" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar crumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Complaints', href: '/admin' }, { label: 'Complaint Details', href: `/admin/incident/${id}` }, { label: 'Assign Complaint' }]} />

        <div style={{ padding: '32px 40px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Assign Complaint</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '28px' }}>Dashboard › Complaints › Complaint Details › <strong>Assign Complaint</strong></p>

          {/* Complaint Summary */}
          {incident && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '24px', border: '1px solid #e8edf2' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem' }}>📄</span> Complaint Summary
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '20px', marginBottom: '20px' }}>
                {[
                  { label: 'COMPLAINT ID', value: `CMP-${String(incident.id).slice(0,8).toUpperCase()}` },
                  { label: 'CATEGORY', value: incident.category?.replace(/_/g,' ') || '—' },
                  { label: 'LOCATION', value: incident.ward || 'Unknown' },
                  { label: 'PRIORITY', value: incident.priority_label || incident.severity || 'High' },
                  { label: 'STATUS', value: null, badge: incident.status },
                ].map((col, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{col.label}</div>
                    {col.badge ? (
                      <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>{col.badge.replace(/_/g,' ')}</span>
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{col.value}</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>DESCRIPTION</div>
                <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{incident.description || 'No description provided.'}</p>
              </div>
            </div>
          )}

          {/* Assign Engineer Form */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8edf2' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ width: '32px', height: '32px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</span>
              Assign Engineer
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '28px' }}>Enter the details of the engineer who is currently available to handle this complaint.</p>

            {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleAssign}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Engineer Name */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Engineer Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" required value={engineerName} onChange={e => setEngineerName(e.target.value)} placeholder="Enter engineer full name"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.border = '1px solid #3b82f6'} onBlur={e => e.target.style.border = '1px solid #e2e8f0'} />
                </div>

                {/* Employee ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" required value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="Enter employee ID"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                    onFocus={e => e.target.style.border = '1px solid #3b82f6'} onBlur={e => e.target.style.border = '1px solid #e2e8f0'} />
                </div>

                {/* Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Mobile Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                  <input type="text" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="Enter mobile number"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                    onFocus={e => e.target.style.border = '1px solid #3b82f6'} onBlur={e => e.target.style.border = '1px solid #e2e8f0'} />
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Helps to contact the engineer quickly.</p>
                </div>

                {/* Department */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Department <span style={{ color: '#ef4444' }}>*</span></label>
                  <select required value={department} onChange={e => setDepartment(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: department ? '#0f172a' : '#94a3b8', cursor: 'pointer' }}
                    onFocus={e => e.target.style.border = '1px solid #3b82f6'} onBlur={e => e.target.style.border = '1px solid #e2e8f0'}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" onClick={() => navigate(`/admin/incident/${id}`)}
                  style={{ flex: 1, padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={assigning}
                  style={{ flex: 2, padding: '14px', border: 'none', borderRadius: '8px', background: assigning ? '#86efac' : '#22c55e', color: '#fff', fontWeight: 700, cursor: assigning ? 'not-allowed' : 'pointer', fontSize: '0.95rem', transition: 'background 0.2s' }}>
                  {assigning ? 'Assigning...' : 'Assign Engineer & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
