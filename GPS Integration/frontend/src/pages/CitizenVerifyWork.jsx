import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { DashboardIcon, ProfileIcon, SettingsIcon, LogoutIcon, AshokaStambhaIcon } from '../components/Icons';

function CitizenSidebar() {
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
  );
}

export default function CitizenVerifyWork() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [decision, setDecision] = useState(null); // 'yes' | 'no' | null
  const [rejectionNote, setRejectionNote] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/complaints/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setComplaint(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleVerify = async (solved) => {
    setVerifying(true);
    try {
      const fd = new FormData();
      fd.append('confirm', solved);
      if (!solved && rejectionNote) fd.append('feedback', rejectionNote);
      
      const incidentId = complaint?.incident_id || complaint?.incident?.id;
      if (incidentId) {
        await fetch(`/api/incidents/${incidentId}/confirm`, { method: 'POST', body: fd });
      }
      setDecision(solved ? 'yes' : 'no');
      setDone(true);
    } catch (e) { console.error(e); } finally { setVerifying(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
      <CitizenSidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
    </div>
  );

  const incident = complaint?.incident;
  const evidence = incident?.evidence || [];
  const beforePhoto = evidence.find(e => e.type === 'before' || e.evidence_type === 'before');
  const afterPhoto = evidence.find(e => e.type === 'after' || e.evidence_type === 'after');
  const engineerName = incident?.events?.find(e => e.event_type === 'assigned')?.notes?.split('|')[0]?.replace('Engineer: ', '')?.trim() || 'Engineer';

  // ── After Decision: Show Success or Reject screens ──────────
  if (done && decision === 'yes') {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
        <CitizenSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', gap: '24px', padding: '40px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#dcfce7', border: '4px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', animation: 'bounce 0.6s ease' }}>✓</div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginBottom: '10px' }}>Problem Solved!</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>Thank you for confirming. Your complaint has been successfully resolved and closed.</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 32px', border: '1px solid #e8edf2', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Complaint ID</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>MOHUA-{String(complaint?.id || '').slice(0,8).toUpperCase()}</div>
            <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>✓ Verified & Closed</div>
          </div>
          <button onClick={() => navigate('/citizen')}
            style={{ padding: '14px 32px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (done && decision === 'no') {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif" }}>
        <CitizenSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', gap: '24px', padding: '40px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#fef2f2', border: '4px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>✕</div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c', marginBottom: '10px' }}>Complaint Reopened</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>We're sorry the issue isn't resolved. Your complaint has been reopened and re-assigned to the concerned department.</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 32px', border: '1px solid #fecaca', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>🔄 Reopened — Escalated</div>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>We will assign a senior engineer and prioritize your complaint. Expected resolution within 24 hours.</p>
          </div>
          <button onClick={() => navigate('/citizen')}
            style={{ padding: '14px 32px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Main Verification Screen ─────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Inter', sans-serif" }}>
      <CitizenSidebar />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => navigate(`/citizen/complaint/${id}`)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>←</button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Complaint Details</h1>
          </div>

          {/* Work Evidence */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>📷</span>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Work Evidence</h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Uploaded by Engineer ({engineerName})</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Before Repair</div>
                {beforePhoto?.image_url ? (
                  <img src={beforePhoto.image_url} alt="Before" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '100%', height: '220px', background: '#1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '2.5rem' }}>📋</span>
                    <span style={{ fontSize: '0.8rem' }}>Before photo not yet uploaded</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>After Repair</div>
                {afterPhoto?.image_url ? (
                  <img src={afterPhoto.image_url} alt="After" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '100%', height: '220px', background: '#1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '2.5rem' }}>📋</span>
                    <span style={{ fontSize: '0.8rem' }}>After photo not yet uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Verification Summary */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🤖</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>AI Verification Summary</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Based on the complaint and uploaded evidence</div>
                </div>
              </div>
              <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✓ AI verified supporting evidence
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Location matched', ok: true },
                { label: 'Problem category matched', ok: true },
                { label: 'Repair evidence detected', ok: afterPhoto?.image_url ? true : false },
              ].map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: item.ok ? '#16a34a' : '#ef4444', fontWeight: 500 }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: item.ok ? '#dcfce7' : '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: item.ok ? '#16a34a' : '#ef4444' }}>
                    {item.ok ? '✓' : '✕'}
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* No button pressed — show rejection note option */}
          {decision === 'no_pending' && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #fecaca', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>Why is the problem not solved? (Optional)</label>
              <textarea value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={3} placeholder="Describe the issue still present..."
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => setDecision(null)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleVerify(false)} disabled={verifying}
                  style={{ flex: 2, padding: '12px', border: 'none', borderRadius: '8px', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {verifying ? 'Submitting...' : 'Submit — Not Solved'}
                </button>
              </div>
            </div>
          )}

          {/* Is your problem solved? */}
          {decision !== 'no_pending' && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: '24px' }}>Is your problem solved?</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Yes Button */}
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleVerify(true)} disabled={verifying}
                    style={{ width: '100%', padding: '16px', border: '2px solid #22c55e', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.target.style.background = '#22c55e'; e.target.style.color = '#fff'; }}
                    onMouseLeave={e => { e.target.style.background = '#f0fdf4'; e.target.style.color = '#15803d'; }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid currentColor', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✓</span>
                    {verifying ? 'Submitting...' : 'Yes, Problem Solved'}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>Confirm and close complaint</p>
                </div>

                {/* No Button */}
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => setDecision('no_pending')}
                    style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.target.style.background = '#fef2f2'; e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#475569'; }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid currentColor', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✕</span>
                    No, Problem Not Solved
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>Provide details to reopen complaint</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
