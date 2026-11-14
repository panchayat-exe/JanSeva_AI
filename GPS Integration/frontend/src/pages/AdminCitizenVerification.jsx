import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  DashboardIcon, 
  ComplaintsIcon, 
  GeoVisionIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

// ── Sidebar Navigation ────────────────────────────────────────
function SidebarNav({ activePage }) {
  const { i18n } = useTranslation();
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
          <Link
            key={item.id}
            to={item.href}
            className={`jv-nav-item ${activePage === item.id ? 'jv-nav-item--active' : ''}`}
          >
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

// ── Top Header ────────────────────────────────────────────────
function TopHeader({ breadcrumbs }) {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="jv-topheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
      <div className="jv-breadcrumb" style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', gap: '8px' }}>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {idx > 0 && <span>›</span>}
            {crumb.href ? <Link to={crumb.href} style={{ color: '#64748b', textDecoration: 'none' }}>{crumb.label}</Link> : <span style={{ color: '#0f172a', fontWeight: 500 }}>{crumb.label}</span>}
          </span>
        ))}
      </div>
      <div className="jv-topheader-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ cursor: 'pointer', position: 'relative' }}>
          🔔 <span style={{ position: 'absolute', top: -5, right: -5, background: '#f97316', color: '#fff', fontSize: '0.65rem', padding: '2px 5px', borderRadius: '10px' }}>3</span>
        </div>
        <button onClick={toggleLanguage} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
          {i18n.language === 'en' ? 'English' : 'हिंदी'} ▾
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
          <div style={{ width: '32px', height: '32px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
          Admin
        </div>
      </div>
    </header>
  );
}

export default function AdminCitizenVerification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verified');

  useEffect(() => {
    async function fetchIncident() {
      try {
        const res = await fetch(`/api/incidents/${id}`);
        if (res.ok) {
          const data = await res.json();
          setIncident(data);
          
          // Auto-select tab based on status if we have feedback
          if (data.status === 'reopened') {
            setActiveTab('not_verified');
          } else {
            setActiveTab('verified');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIncident();
  }, [id]);

  if (loading) {
    return (
      <div className="jv-layout" style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
        <SidebarNav activePage="complaints" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="jv-layout" style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
        <SidebarNav activePage="complaints" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Incident not found.</div>
      </div>
    );
  }

  // Find the verification events
  const verifyEvent = incident.events?.find(e => e.event_type === 'citizen_confirmed');
  const rejectEvent = incident.events?.find(e => e.event_type === 'citizen_rejected');

  const isVerified = !!verifyEvent || incident.status === 'verified_resolved';
  const isRejected = !!rejectEvent || incident.status === 'reopened';
  const isPending = incident.status === 'awaiting_citizen_confirm';

  return (
    <div className="jv-layout" style={{ display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <SidebarNav activePage="complaints" />

      <div className="jv-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Complaints', href: '/admin' },
            { label: 'Complaint Details', href: `/admin/incident/${id}` },
            { label: 'Verification Status' },
          ]}
        />

        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Title & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Citizen Verification</h1>
            
            <button 
              onClick={() => navigate(`/admin/incident/${id}`)}
              style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
            >
              Back to Details
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setActiveTab('verified')}
                style={{ 
                  flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 600, color: activeTab === 'verified' ? '#22c55e' : '#64748b',
                  borderBottom: activeTab === 'verified' ? '3px solid #22c55e' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                Verified
              </button>
              <button
                onClick={() => setActiveTab('not_verified')}
                style={{ 
                  flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 600, color: activeTab === 'not_verified' ? '#ef4444' : '#64748b',
                  borderBottom: activeTab === 'not_verified' ? '3px solid #ef4444' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                Not Verified
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '32px 24px' }}>
              {activeTab === 'verified' && (
                <div>
                  {isVerified ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#22c55e', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✓</div>
                        <h2 style={{ margin: 0, color: '#15803d', fontSize: '1.25rem', fontWeight: 600 }}>Verified by Citizen</h2>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Complaint ID</div>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}>CMP-{String(incident.id).slice(0, 8).toUpperCase()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Category</div>
                          <div style={{ color: '#0f172a', fontWeight: 500, textTransform: 'capitalize' }}>{incident.category?.replace(/_/g, ' ')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Location</div>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}>{incident.ward || 'Unknown Ward'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Verified On</div>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}>
                            {verifyEvent ? new Date(verifyEvent.timestamp).toLocaleString() : new Date(incident.resolved_at || Date.now()).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Citizen Feedback</div>
                          <div style={{ color: '#334155', fontStyle: 'italic' }}>"{verifyEvent?.metadata?.feedback || 'Work completed successfully.'}"</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⏳</span>
                      {isPending ? 'Awaiting citizen verification...' : 'This complaint has not been verified yet.'}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'not_verified' && (
                <div>
                  {isRejected ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#ef4444', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✕</div>
                        <h2 style={{ margin: 0, color: '#b91c1c', fontSize: '1.25rem', fontWeight: 600 }}>Complaint Not Verified</h2>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Citizen Response</div>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}>Rejected Resolution</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Reason</div>
                          <div style={{ color: '#334155', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                            "{rejectEvent?.metadata?.feedback || 'The issue is not completely fixed.'}"
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Submitted On</div>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}>
                            {rejectEvent ? new Date(rejectEvent.timestamp).toLocaleString() : new Date().toLocaleString()}
                          </div>
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Action Required</div>
                          <button onClick={() => navigate(`/admin/incident/${id}/assign`)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                            Re-Assign Engineer
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>✔️</span>
                      This complaint has not been rejected.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
