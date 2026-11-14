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

// The 5 lifecycle steps
const STEPS = [
  { label: 'Assigned', icon: '✓', eventType: 'assigned' },
  { label: 'Engineer Reached Location', icon: '✓', eventType: 'engineer_arrived' },
  { label: 'Work In Progress', icon: '✓', eventType: 'work_started' },
  { label: 'Work Completed', icon: '📷', eventType: 'work_completed' },
  { label: 'Verified', icon: '📋', eventType: 'citizen_confirmed' },
];

function StepCircle({ icon, done, active, date }) {
  const bg = done ? '#22c55e' : '#fff';
  const border = done ? '#22c55e' : active ? '#22c55e' : '#e2e8f0';
  const iconColor = done ? '#fff' : active ? '#22c55e' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 1 }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: bg, border: `2.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: iconColor, fontWeight: 700, boxShadow: active ? '0 0 0 5px rgba(34,197,94,0.12)' : 'none', transition: 'all 0.3s' }}>
        {done ? '✓' : icon}
      </div>
    </div>
  );
}

export default function AdminComplaintProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) setIncident(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchIncident();
    const iv = setInterval(fetchIncident, 15000);
    return () => clearInterval(iv);
  }, [id]);

  const handleUploadEvidence = async (file, evidenceType) => {
    if (!file) return;
    if (evidenceType === 'before') setUploadingBefore(true);
    else setUploadingAfter(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('evidence_type', evidenceType);
      fd.append('uploaded_by', 'engineer_demo');
      await fetch(`/api/incidents/${id}/evidence`, { method: 'POST', body: fd });
      await fetchIncident();
    } catch (e) { console.error(e); } finally {
      if (evidenceType === 'before') setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    try {
      const fd = new FormData();
      fd.append('event_type', 'work_completed');
      fd.append('actor', 'engineer');
      fd.append('notes', 'Work completed by engineer');
      await fetch(`/api/incidents/${id}/events`, { method: 'POST', body: fd });
      // Also update status
      const statusFd = new FormData();
      statusFd.append('status', 'awaiting_citizen_confirm');
      await fetch(`/api/incidents/${id}/status`, { method: 'POST', body: statusFd });
      await fetchIncident();
    } catch (e) { console.error(e); } finally { setMarkingComplete(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
      <Sidebar active="complaints" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
    </div>
  );

  // Determine which steps are done based on events and status
  const events = incident?.events || [];
  const stepsDone = STEPS.map(step => {
    if (step.eventType === 'citizen_confirmed') return incident?.status === 'verified_resolved';
    if (step.eventType === 'work_completed') return incident?.status === 'awaiting_citizen_confirm' || incident?.status === 'verified_resolved' || incident?.status === 'reopened' || events.some(e => e.event_type === 'work_completed');
    return events.some(e => e.event_type === step.eventType) || incident?.status === 'assigned' && step.eventType === 'assigned';
  });

  // Always mark "Assigned" as done if status is assigned or later
  const isAssigned = ['assigned','in_progress','awaiting_citizen_confirm','verified_resolved','reopened'].includes(incident?.status);
  if (isAssigned) stepsDone[0] = true;

  const currentStepIdx = stepsDone.lastIndexOf(true);
  const isCompleted = currentStepIdx >= 3;
  const isFullyVerified = incident?.status === 'verified_resolved';

  // Get event timestamps for each step
  const getStepDate = (eventType) => {
    const ev = events.find(e => e.event_type === eventType);
    if (ev?.timestamp) {
      return new Date(ev.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (eventType === 'assigned' && isAssigned && incident?.created_at) {
      return new Date(incident.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return '—';
  };

  // Evidence photos
  const evidence = incident?.evidence || [];
  const beforePhoto = evidence.find(e => e.type === 'before' || e.evidence_type === 'before') || (evidence[0] ? evidence[0] : null);
  const afterPhoto = evidence.find(e => e.type === 'after' || e.evidence_type === 'after');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active="complaints" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar crumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Complaints', href: '/admin' },
          { label: 'Complaint Details', href: `/admin/incident/${id}` },
          { label: 'Complaint Progress' },
        ]} />

        <div style={{ padding: '32px 40px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '28px' }}>Complaint Progress</h1>

          {/* ── Stepper Card ── */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8edf2', marginBottom: '24px', textAlign: 'center' }}>
            {isCompleted && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', border: '2.5px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.8rem', color: '#16a34a' }}>✓</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a', marginBottom: '6px' }}>Complaint Completed Successfully!</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>The engineer has completed the work for this complaint.</p>
              </div>
            )}

            {/* Steps row */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 16px' }}>
              {/* connector line */}
              <div style={{ position: 'absolute', top: '25px', left: '10%', right: '10%', height: '2.5px', background: '#e8edf2', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '25px', left: '10%', width: `${(Math.max(0, currentStepIdx) / (STEPS.length - 1)) * 80}%`, height: '2.5px', background: '#22c55e', zIndex: 0, transition: 'width 0.4s ease' }} />

              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%' }}>
                  <StepCircle icon={step.icon} done={stepsDone[i]} active={i === currentStepIdx + 1} />
                  <div style={{ marginTop: '12px', fontSize: '0.78rem', fontWeight: 600, color: stepsDone[i] ? '#1e293b' : '#94a3b8', textAlign: 'center', lineHeight: 1.4, maxWidth: '100px' }}>{step.label}</div>
                  {step.eventType !== 'citizen_confirmed' && (
                    <div style={{ fontSize: '0.72rem', color: stepsDone[i] ? '#22c55e' : '#cbd5e1', fontWeight: 500, marginTop: '4px', textAlign: 'center' }}>{getStepDate(step.eventType)}</div>
                  )}
                  {step.eventType === 'citizen_confirmed' && (
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 500, marginTop: '4px' }}>—</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Evidence Uploaded by Engineer ── */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8edf2', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <span style={{ fontSize: '1.2rem' }}>📷</span> Evidence Uploaded by Engineer
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Before Photo */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>Before Photo</div>
                {beforePhoto?.image_url ? (
                  <img src={beforePhoto.image_url} alt="Before" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ width: '100%', height: '240px', background: '#f8fafc', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                      <span style={{ fontSize: '2rem' }}>📷</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{uploadingBefore ? 'Uploading...' : 'Upload Before Photo'}</span>
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUploadEvidence(e.target.files[0], 'before')} />
                  </label>
                )}
              </div>

              {/* After Photo */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>After Photo</div>
                {afterPhoto?.image_url ? (
                  <img src={afterPhoto.image_url} alt="After" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ width: '100%', height: '240px', background: '#f8fafc', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                      <span style={{ fontSize: '2rem' }}>📷</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{uploadingAfter ? 'Uploading...' : 'Upload After Photo'}</span>
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUploadEvidence(e.target.files[0], 'after')} />
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isCompleted && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => navigate(`/admin/incident/${id}`)}
                  style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  Back
                </button>
                <button onClick={handleMarkComplete} disabled={markingComplete}
                  style={{ flex: 2, padding: '12px', border: 'none', borderRadius: '8px', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {markingComplete ? 'Marking...' : '✓ Mark Work as Complete & Send for Verification'}
                </button>
              </div>
            )}

            {isCompleted && (
              <div style={{ marginTop: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#15803d', fontWeight: 600 }}>✓ Sent to citizen for verification</div>
                <button onClick={() => navigate(`/admin/incident/${id}/verification`)}
                  style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                  View Verification Status →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
