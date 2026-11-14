import React from 'react';

export default function EvidencePanel({ evidence }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div style={{ position: 'absolute', top: '80px', right: '24px', width: '320px', zIndex: 20, padding: '20px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', pointerEvents: 'auto' }}>
         <div className="eyebrow" style={{ color: 'white', marginBottom: '8px' }}>RESOLUTION EVIDENCE</div>
         <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>No evidence uploaded yet.</p>
      </div>
    );
  }

  const before = evidence.find(e => e.type === 'before') || evidence[0];
  const after = evidence.find(e => e.type === 'after');

  return (
    <div style={{ position: 'absolute', top: '80px', right: '24px', width: '320px', zIndex: 20, padding: '20px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
      <div className="eyebrow" style={{ color: 'white' }}>RESOLUTION EVIDENCE</div>
      
      {before && (
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>BEFORE</div>
          <img src={before.image_url} alt="Before" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
        </div>
      )}
      
      {after && (
        <div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>AFTER</span>
            {after.cv_result && after.cv_result.verdict === 'resolved' && <span>✅ VERIFIED</span>}
          </div>
          <img src={after.image_url} alt="After" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #10b981' }} />
        </div>
      )}
    </div>
  );
}
