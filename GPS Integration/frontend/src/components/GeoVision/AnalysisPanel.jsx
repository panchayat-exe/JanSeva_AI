import React, { useState, useCallback } from 'react';

/**
 * AnalysisPanel — Location Intelligence and Decision Support Engine
 */
export default function AnalysisPanel({ 
  incident, 
  intelligence, 
  intelligenceStatus, 
  onEnterStreetView,
  onDispatchBrief 
}) {
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState(null);

  if (!incident) return null;

  // The base coordinates are from the incident.
  // But if intelligence indicates a custom target, we show those.
  const isCustomTarget = intelligence?.target?.isCustomLocation;
  const lat = isCustomTarget ? intelligence.target.lat : incident.representative_lat;
  const lng = isCustomTarget ? intelligence.target.lng : incident.representative_lng;

  const handleCopyCoords = useCallback(() => {
    if (lat && lng) {
      const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [lat, lng]);

  const handleGenerateBrief = () => {
    setBriefGenerated(true);
  };

  const handleDispatch = async () => {
    setDispatchStatus('dispatching');
    if (onDispatchBrief) {
      setTimeout(async () => {
        setDispatchStatus('dispatched');
        setTimeout(async () => {
          await onDispatchBrief();
        }, 1200);
      }, 800);
    } else {
      setTimeout(() => setDispatchStatus('dispatched'), 1000);
    }
  };

  // Helper to render infrastructure counts
  const renderInfraCounts = () => {
    if (!intelligence || !intelligence.stats) return null;
    const cats = intelligence.stats.categories;
    const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    
    if (entries.length === 0) return <div className="gv-analysis-sub">No mapped infrastructure found.</div>;

    return (
      <div className="gv-infra-grid">
        {entries.map(([category, count]) => (
          <div key={category} className="gv-infra-stat">
            <span className="gv-infra-stat-label">{category}</span>
            <span className="gv-infra-stat-val">{count}</span>
          </div>
        ))}
      </div>
    );
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      default: return '#10b981';
    }
  };

  const getEvidenceColor = (status) => {
    switch (status) {
      case 'GPS VERIFIED': return '#10b981';
      case 'GPS MISMATCH': return '#f97316';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="gv-analysis-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', pointerEvents: 'auto' }}>
      <div className="gv-panel-header">LOCATION INTELLIGENCE</div>

      {/* 1. LOCATION */}
      <div className="gv-analysis-section">
        <div className="gv-analysis-label">{isCustomTarget ? '1. SELECTED LOCATION' : '1. INCIDENT ORIGIN'}</div>
        <div className="gv-analysis-coords gv-analysis-value" onClick={handleCopyCoords} title="Copy" style={{ color: isCustomTarget ? '#3b82f6' : 'inherit' }}>
          {lat?.toFixed(6)}, {lng?.toFixed(6)}
        </div>
        {isCustomTarget && intelligence?.target?.distanceFromIncident > 0 && (
          <div className="gv-analysis-sub" style={{ color: '#3b82f6', fontWeight: 600 }}>
            Offset: {Math.round(intelligence.target.distanceFromIncident)}m from incident
          </div>
        )}
        <div className="gv-analysis-sub">Area: {incident.ward || incident.address || 'Unknown'}</div>
      </div>

      <div className="gv-analysis-divider" />

      {/* 2. INCIDENT */}
      <div className="gv-analysis-section">
        <div className="gv-analysis-label">2. INCIDENT</div>
        <div className="gv-analysis-value">{incident.category?.toUpperCase()}</div>
        <div className="gv-analysis-sub">Severity: <span style={{ color: incident.priority_color || 'var(--status-high)', fontWeight: 600 }}>{incident.severity?.toUpperCase()}</span></div>
        <div className="gv-analysis-sub">Impact Radius: {incident.impact_radius || 500}m</div>
      </div>

      <div className="gv-analysis-divider" />

      {/* PROGRESSIVE INTELLIGENCE */}
      {intelligenceStatus === 'loading' && (
        <div className="gv-intelligence-loading">
          <div className="gv-spinner small"></div>
          <span>ANALYZING SELECTED LOCATION...</span>
        </div>
      )}

      {intelligence && (
        <>
          {/* 3. SPATIAL CONTEXT */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">3. SPATIAL CONTEXT</div>
            {renderInfraCounts()}
            {intelligence.weather && (
              <div className="gv-analysis-sub" style={{ marginTop: '8px' }}>
                Weather: {intelligence.weather.condition}, {intelligence.weather.temperature}°C
              </div>
            )}
          </div>

          <div className="gv-analysis-divider" />

          {/* 4. INFRASTRUCTURE IMPACT */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">4. INFRASTRUCTURE IMPACT</div>
            {intelligence.infrastructure && intelligence.infrastructure.length > 0 ? (
              <div className="gv-exposure-list">
                {intelligence.infrastructure.slice(0, 4).map(i => (
                  <div key={i.id} className="gv-exposure-item" style={{ 
                    background: i.impactLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 
                                i.impactLevel === 'HIGH' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${i.impactLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 
                                       i.impactLevel === 'HIGH' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                  }}>
                    <div>
                      <div className="gv-exposure-name" style={{ color: i.impactLevel === 'CRITICAL' ? '#fca5a5' : i.impactLevel === 'HIGH' ? '#fdba74' : '#cbd5e1' }}>
                        {i.name || i.category}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Math.round(i.distanceMeters)}m away</div>
                    </div>
                    <div className="gv-exposure-dist" style={{ color: i.impactLevel === 'CRITICAL' ? '#ef4444' : i.impactLevel === 'HIGH' ? '#f97316' : '#94a3b8' }}>
                      {i.impactLevel}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gv-analysis-sub">No mapped critical infrastructure found within the analysis radius.</div>
            )}
          </div>

          <div className="gv-analysis-divider" />

          {/* 5. RELATED COMPLAINTS */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">5. RELATED COMPLAINTS</div>
            <div className="gv-analysis-value">
              {intelligence.relatedComplaints?.length || 0} similar issues mapped
            </div>
            {intelligence.relatedComplaints?.length > 0 ? (
              <>
                <div className="gv-analysis-sub" style={{ 
                  color: intelligence.hotspotLevel?.includes('CRITICAL') ? '#ef4444' : 
                         intelligence.hotspotLevel?.includes('HIGH') ? '#f97316' : 'var(--text-secondary)',
                  fontWeight: 600, marginTop: '4px'
                }}>
                  {intelligence.hotspotLevel}
                </div>
                <div className="gv-analysis-sub" style={{ marginTop: '2px' }}>
                  Recurring: {intelligence.historical?.recurring} ({intelligence.historical?.period})
                </div>
              </>
            ) : (
              <div className="gv-analysis-sub">No related complaints found within the analysis radius.</div>
            )}
          </div>

          <div className="gv-analysis-divider" />

          {/* 6. EVIDENCE SPATIAL VERIFICATION */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">6. EVIDENCE SPATIAL VERIFICATION</div>
            {intelligence.evidenceVerification ? (
              <>
                <div className="gv-analysis-value" style={{ color: getEvidenceColor(intelligence.evidenceVerification.status) }}>
                  {intelligence.evidenceVerification.status}
                </div>
                <div className="gv-analysis-sub" style={{ marginTop: '4px' }}>
                  {intelligence.evidenceVerification.message}
                </div>
              </>
            ) : (
              <div className="gv-analysis-value">
                {incident.evidence && incident.evidence.length > 0 ? 'Photographic Evidence Available' : 'No Citizen Evidence'}
              </div>
            )}
          </div>

          <div className="gv-analysis-divider" />

          {/* 7. SPATIAL RISK */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">7. SPATIAL RISK</div>
            <div className="gv-analysis-value" style={{ color: getRiskColor(intelligence.risk?.level) }}>
              {intelligence.risk?.level || 'UNKNOWN'}
            </div>
            {/* Traceability */}
            <div className="gv-analysis-sub" style={{ marginTop: '6px', fontWeight: 600, color: '#94a3b8' }}>WHY {intelligence.risk?.level}?</div>
            <div className="gv-risk-reasons">
              {intelligence.risk?.reasons?.map((r, idx) => (
                <div key={idx} className="gv-risk-reason">✓ {r}</div>
              ))}
            </div>
          </div>

          <div className="gv-analysis-divider" />

          {/* 8. RECOMMENDATION */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">8. RECOMMENDATION</div>
            <div className="gv-analysis-value" style={{ fontSize: '0.95rem' }}>
              {intelligence.recommendation?.department?.toUpperCase()}
            </div>
            <div className="gv-analysis-sub" style={{ marginTop: '4px', color: '#e2e8f0' }}>
              Priority: <span style={{ fontWeight: 600 }}>{intelligence.recommendation?.priority}</span>
            </div>
            <div className="gv-analysis-sub" style={{ marginTop: '2px', color: '#e2e8f0' }}>
              Action: {intelligence.recommendation?.action}
            </div>
            {/* Traceability */}
            <div className="gv-analysis-sub" style={{ marginTop: '6px', fontWeight: 600, color: '#94a3b8' }}>WHY THIS RECOMMENDATION?</div>
            <div className="gv-risk-reasons">
              {intelligence.recommendation?.reasons?.map((r, idx) => (
                <div key={idx} className="gv-risk-reason">• {r}</div>
              ))}
            </div>
          </div>

          <div className="gv-analysis-divider" />

          {/* 9 & 10. ACTION & DISPATCH */}
          <div className="gv-analysis-section">
            <div className="gv-analysis-label">9. ACTION & DISPATCH</div>
            <div className="gv-decision-support" style={{ marginTop: '8px' }}>
              {!briefGenerated ? (
                <button className="gv-btn-primary" onClick={handleGenerateBrief}>
                  GENERATE DEPARTMENT BRIEF
                </button>
              ) : (
                <div className="gv-dept-brief-container">
                  <div className="gv-dept-brief-preview">
                    <pre>{intelligence.brief}</pre>
                  </div>
                  
                  {dispatchStatus === 'dispatched' ? (
                    <div className="gv-dispatch-success" style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', textAlign: 'center' }}>
                      ✓ DISPATCHED TO {intelligence.recommendation?.department?.toUpperCase()}
                    </div>
                  ) : (
                    <button 
                      className="gv-btn-primary" 
                      onClick={handleDispatch}
                      disabled={dispatchStatus === 'dispatching'}
                      style={{ background: dispatchStatus === 'dispatching' ? '#475569' : '#10b981' }}
                    >
                      {dispatchStatus === 'dispatching' ? 'SENDING...' : `DISPATCH TO DEPARTMENT`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="gv-analysis-divider" />

          {/* 11. DATA SOURCES & FRESHNESS */}
          <div className="gv-analysis-section" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div className="gv-analysis-label" style={{ marginBottom: '8px' }}>DATA SOURCES & FRESHNESS</div>
            
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>OPEN-METEO (Weather)</span>
                <span>{intelligence.weather ? intelligence.weather.retrievedAt : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>OPENSTREETMAP (Infrastructure)</span>
                <span>{intelligence.infrastructure?.[0]?.retrievedAt || new Date(intelligence.retrievedAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>JANSEVA DATABASE (Complaints)</span>
                <span>{intelligence.historical?.retrievedAt || new Date(intelligence.retrievedAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>EXIF GPS Verification</span>
                <span>Internal Check</span>
              </div>
            </div>
          </div>
          
        </>
      )}
    </div>
  );
}
