import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardIcon, ProfileIcon, SettingsIcon, LogoutIcon, AshokaStambhaIcon } from '../components/Icons';

function CitizenSidebar({ active }) {
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
        <Link to="/citizen" className={`jv-nav-item ${active === 'dashboard' ? 'jv-nav-item--active' : ''}`}>
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
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ background: '#e8edf2', borderRadius: '99px', height: '8px', overflow: 'hidden', margin: '6px 0' }}>
      <div style={{ width: `${value}%`, height: '100%', background: '#f97316', borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

const categoryIcons = {
  water_supply: '💧', road_damage: '🛣️', pothole: '🛣️', electricity: '⚡',
  garbage: '🗑️', drainage: '🌊', streetlight: '💡', default: '📋'
};

function getStatusColor(status) {
  if (status === 'resolved' || status === 'verified_resolved') return { bg: '#dcfce7', color: '#16a34a', label: 'Resolved' };
  if (status === 'in_progress') return { bg: '#fff7ed', color: '#c2410c', label: 'In Progress' };
  if (status === 'awaiting_citizen_confirm') return { bg: '#eff6ff', color: '#1d4ed8', label: 'Awaiting Verification' };
  if (status === 'assigned') return { bg: '#f1f5f9', color: '#475569', label: 'Assigned' };
  return { bg: '#f1f5f9', color: '#64748b', label: status?.replace(/_/g,' ') || 'Pending' };
}

function getProgressValue(status) {
  if (status === 'verified_resolved') return 100;
  if (status === 'awaiting_citizen_confirm') return 90;
  if (status === 'in_progress') return 70;
  if (status === 'assigned') return 40;
  return 10;
}

function getLatestUpdate(incident) {
  if (!incident) return null;
  const events = incident.events || [];
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  const messages = {
    'assigned': 'Engineer has been assigned to this complaint.',
    'engineer_arrived': 'Engineer has arrived at the location.',
    'work_started': 'Engineer visit completed. Repair work has been started.',
    'work_completed': 'Work has been completed by the engineer.',
    'citizen_confirmed': 'You verified that the issue is resolved.',
    'citizen_rejected': 'You reported the issue is not resolved yet.',
  };
  return {
    message: messages[last.event_type] || last.notes || 'Status updated.',
    actor: last.actor || 'Engineer',
    timestamp: last.timestamp,
    statusLabel: last.event_type?.replace(/_/g, ' ') || 'Updated',
  };
}

export default function CitizenComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/complaints/${id}`);
        if (res.ok) setComplaint(await res.json());
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
      <CitizenSidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
    </div>
  );

  if (!complaint) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
      <CitizenSidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>Complaint not found.</div>
    </div>
  );

  const incident = complaint.incident;
  const statusInfo = getStatusColor(incident?.status || complaint.status);
  const progress = getProgressValue(incident?.status || complaint.status);
  const catKey = (complaint.category || 'default').toLowerCase().replace(/\s/g,'_');
  const catIcon = categoryIcons[catKey] || categoryIcons.default;
  const latestUpdate = getLatestUpdate(incident);
  const isAwaitingVerify = incident?.status === 'awaiting_citizen_confirm';
  const evidence = incident?.evidence || [];
  const hasEvidence = evidence.length > 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Inter', sans-serif" }}>
      <CitizenSidebar active="dashboard" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 28px', background: '#fff', borderBottom: '1px solid #e8edf2' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
            भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF HOUSING & URBAN AFFAIRS
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ position: 'relative', cursor: 'pointer', fontSize: '1.1rem' }}>
              🔔 <span style={{ position: 'absolute', top: -4, right: -4, background: '#f97316', color: '#fff', borderRadius: '999px', fontSize: '0.6rem', padding: '1px 4px', fontWeight: 700 }}>3</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 600, background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              👤 Citizen ▾
            </div>
          </div>
        </header>

        <div style={{ padding: '28px 36px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
          {/* Back + Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => navigate('/citizen')} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>←</button>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Complaint Details</h1>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}>?</button>
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}>↗</button>
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}>⋮</button>
            </div>
          </div>

          {/* Main complaint card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {/* Icon */}
              <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                {catIcon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{complaint.category?.replace(/_/g,' ') || 'Complaint'} Issue</h2>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>🏷️ Complaint ID: <strong style={{ color: '#0f172a' }}>MOHUA-{String(complaint.id).slice(0,8).toUpperCase()}</strong></span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>📅 {new Date(complaint.created_at || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {complaint.ward || incident?.ward || 'Unknown Location'}</span>
                    </div>
                  </div>
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '5px 14px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{statusInfo.label}</span>
                </div>

                {/* Progress */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{progress}% Complete</span>
                    <span>Est. Resolution: <strong style={{ color: '#0f172a' }}>Today • 6:30 PM</strong></span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              </div>
            </div>
          </div>

          {/* Latest Update */}
          {latestUpdate && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Latest Update</h3>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>👷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{latestUpdate.message}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    by {latestUpdate.actor} &nbsp;·&nbsp;
                    📅 {new Date(latestUpdate.timestamp || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{latestUpdate.statusLabel}</span>
              </div>
            </div>
          )}

          {/* Photos / Evidence */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Photos / Evidence</h3>
            {!hasEvidence ? (
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', color: '#94a3b8' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🔒</div>
                <div style={{ fontSize: '0.85rem' }}>Evidence will be uploaded after the work is completed.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {evidence.slice(0, 4).map((ev, i) => (
                  <img key={i} src={ev.image_url} alt={`Evidence ${i+1}`} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            )}
          </div>

          {/* Verification CTA */}
          {isAwaitingVerify && (
            <button onClick={() => navigate(`/citizen/complaint/${id}/verify`)}
              style={{ width: '100%', padding: '16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', marginBottom: '12px', letterSpacing: '0.02em' }}>
              ✓ Verify Work Done — Is Your Problem Solved?
            </button>
          )}

          <button onClick={() => navigate('/citizen')}
            style={{ width: '100%', padding: '14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
