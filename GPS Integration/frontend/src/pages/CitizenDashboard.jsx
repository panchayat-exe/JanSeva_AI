import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  DashboardIcon, 
  ComplaintsIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

export default function CitizenDashboard() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch citizen complaints list if in 'complaints' tab
  useEffect(() => {
    if (activeNav === 'complaints') {
      setLoading(true);
      fetch('/api/complaints')
        .then(res => res.json())
        .then(data => setComplaints(Array.isArray(data) ? data : []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [activeNav]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className="jv-layout">
      {/* ── Sidebar Navigation ──────────────────────────────── */}
      <aside className="jv-sidebar">
        <div className="jv-sidebar-brand">
          <div className="jv-emblem">
            <AshokaStambhaIcon width={34} height={34} />
          </div>
          <div className="jv-brand-text">
            <span className="jv-brand-name">JANSEVA AI</span>
            <span className="jv-brand-tagline">Your Voice. Our Action.</span>
          </div>
        </div>

        <div className="jv-sidebar-divider" />

        <nav className="jv-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`jv-nav-item ${activeNav === item.id ? 'jv-nav-item--active' : ''}`}
            >
              <span className="jv-nav-icon">{item.icon}</span>
              <span className="jv-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="jv-sidebar-bottom">
          <Link to="/" className="jv-nav-item jv-nav-logout">
            <span className="jv-nav-icon"><LogoutIcon /></span>
            <span className="jv-nav-label">Logout</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div className="jv-main-area" style={{ background: '#fcfcfd', overflowY: 'auto', flex: 1 }}>
        {/* ── Top Header ────────────────────────────────────── */}
        <header className="jv-topheader" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em' }}>
            भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF HOUSING & URBAN AFFAIRS
          </div>
          <div className="jv-topheader-right">
            <div className="jv-notif-btn">🔔<span className="jv-notif-badge">3</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
              <ProfileIcon />
              <span>Citizen</span>
              <span>▾</span>
            </div>
          </div>
        </header>

        {/* ── Dashboard Content ─────────────────────────────── */}
        {activeNav === 'dashboard' && (
          <div style={{ maxWidth: '1100px', margin: '36px auto', padding: '0 32px' }}>
            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔆</span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Good Morning!</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '28px' }}>We are here to help you.</p>

            {/* Title Banner */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                What would you like to do today?
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                <span style={{ width: '28px', height: '4px', background: '#f97316', borderRadius: '2px' }} />
                <span style={{ width: '28px', height: '4px', background: '#16a34a', borderRadius: '2px' }} />
              </div>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Let's make your city better together.</p>
            </div>

            {/* Action Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {/* Report a Complaint Card */}
              <div style={{
                flex: '1 1 340px',
                background: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: '20px',
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Report a Complaint
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: '28px', maxWidth: '280px' }}>
                  Speak, type or upload an issue you want to report.
                </p>
                <Link to="/citizen/report" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '99px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}>
                  <span>Report Now</span>
                  <span>→</span>
                </Link>
              </div>

              {/* My Complaints Card */}
              <div style={{
                flex: '1 1 340px',
                background: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: '20px',
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    <line x1="9" y1="12" x2="11" y2="12"/>
                    <line x1="9" y1="16" x2="15" y2="16"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  My Complaints
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: '28px', maxWidth: '280px' }}>
                  View your previous complaints and track their status.
                </p>
                <button 
                  onClick={() => setActiveNav('complaints')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '99px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>View Complaints</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Bottom Support Banner */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #f1f5f9',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1.1rem',
                color: '#64748b'
              }}>
                ⓘ
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>We're here for you</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Your feedback helps us improve your city.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── My Complaints View ────────────────────────────── */}
        {activeNav === 'complaints' && (
          <div style={{ maxWidth: '900px', margin: '36px auto', padding: '0 24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
              My Complaints
            </h2>
            {loading ? (
              <div>Loading your complaints...</div>
            ) : complaints.length === 0 ? (
              <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', color: '#64748b' }}>
                No complaints filed yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {complaints.map(c => {
                    const statusColors = {
                      resolved: { bg: '#dcfce7', color: '#16a34a', label: 'Resolved' },
                      verified_resolved: { bg: '#dcfce7', color: '#16a34a', label: 'Resolved' },
                      in_progress: { bg: '#fff7ed', color: '#c2410c', label: 'In Progress' },
                      awaiting_citizen_confirm: { bg: '#eff6ff', color: '#1d4ed8', label: 'Verify Now ✓' },
                      assigned: { bg: '#f1f5f9', color: '#475569', label: 'Assigned' },
                    };
                    const sc = statusColors[c.incident?.status || c.status] || { bg: '#f1f5f9', color: '#64748b', label: 'Pending' };
                    return (
                      <div key={c.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize', marginBottom: '4px' }}>{c.category?.replace(/_/g,' ')}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.address || c.ward || 'Location recorded'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>{sc.label}</span>
                          <Link to={`/citizen/complaint/${c.id}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', textDecoration: 'none', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600 }}>
                            View Details →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
