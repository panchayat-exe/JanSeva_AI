import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Timeline from '../components/Timeline';
import { 
  DashboardIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

export default function CitizenStatus() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await fetch(`/api/complaints/${id}`);
        if (res.ok) {
          const data = await res.json();
          setComplaint(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaint();
    const interval = setInterval(fetchComplaint, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleConfirm = async (isFixed) => {
    if (!complaint?.incident_id) return;
    try {
      const formData = new FormData();
      formData.append('confirm', isFixed);
      await fetch(`/api/incidents/${complaint.incident_id}/confirm`, {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      console.error(err);
    }
  };

  const incident = complaint?.incident;
  const isAwaitingConfirm = incident?.status === 'awaiting_citizen_confirm';
  const isResolved = incident?.status === 'verified_resolved' || complaint?.status === 'resolved';

  return (
    <div className="jv-layout">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
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
          <Link to="/citizen" className="jv-nav-item jv-nav-item--active">
            <span className="jv-nav-icon"><DashboardIcon /></span>
            <span className="jv-nav-label">Dashboard</span>
          </Link>
          <Link to="#" className="jv-nav-item">
            <span className="jv-nav-icon"><ProfileIcon /></span>
            <span className="jv-nav-label">Profile</span>
          </Link>
          <Link to="#" className="jv-nav-item">
            <span className="jv-nav-icon"><SettingsIcon /></span>
            <span className="jv-nav-label">Settings</span>
          </Link>
        </nav>

        <div className="jv-sidebar-bottom">
          <Link to="/" className="jv-nav-item jv-nav-logout">
            <span className="jv-nav-icon"><LogoutIcon /></span>
            <span className="jv-nav-label">Logout</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Canvas ─────────────────────────────────────────── */}
      <div className="jv-main-area" style={{ background: '#fcfcfd', overflowY: 'auto', flex: 1, paddingBottom: '60px' }}>
        {/* Top Header */}
        <header className="jv-topheader" style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em' }}>
            भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF HOUSING & URBAN AFFAIRS
          </div>
          <div className="jv-topheader-right">
            <div className="jv-notif-btn">🔔<span className="jv-notif-badge">3</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
              <ProfileIcon />
              <span>Citizen</span>
              <span>▾</span>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '1.1rem' }}>
              Loading report status...
            </div>
          ) : !complaint ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444', fontSize: '1.1rem' }}>
              Report not found.
            </div>
          ) : (
            <div>
              {/* Main Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: isResolved ? '#dcfce7' : '#fff7ed',
                  color: isResolved ? '#16a34a' : '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 16px'
                }}>
                  {isResolved ? '✓' : '🎉'}
                </div>

                <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  {isResolved ? 'Issue Resolved!' : 'Report Submitted'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '28px' }}>
                  ID: <span style={{ fontWeight: 600, color: '#0f172a' }}>{complaint.id.split('-')[0]}</span>
                </p>

                {/* Info Container */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      CATEGORY DETECTED
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                      {complaint.category || 'Under Review'}
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#475569'
                  }}>
                    {complaint.ward || 'Pending GIS'}
                  </div>
                </div>
              </div>

              {/* Citizen Confirmation prompt if awaiting confirm */}
              {isAwaitingConfirm && (
                <div style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: '18px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ color: '#c2410c', fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
                    {t('citizen.status.awaiting_citizen_confirm')}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#9a3412', marginBottom: '18px' }}>
                    {t('citizen.status.confirm_prompt')}
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => handleConfirm(true)}
                      style={{ flex: 1, padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('citizen.status.confirm_yes')}
                    </button>
                    <button 
                      onClick={() => handleConfirm(false)}
                      style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('citizen.status.confirm_no')}
                    </button>
                  </div>
                </div>
              )}

              {/* Incident Timeline */}
              {incident && (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '28px',
                  marginBottom: '28px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '18px' }}>
                    Incident Timeline
                  </h3>
                  <Timeline events={incident.events} />
                </div>
              )}

              {/* Report Another Issue Button */}
              <Link to="/citizen/report" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '16px',
                borderRadius: '99px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}>
                Report Another Issue
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
