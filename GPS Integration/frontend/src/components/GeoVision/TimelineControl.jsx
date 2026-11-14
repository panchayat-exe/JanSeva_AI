import React from 'react';

export default function TimelineControl({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={{ position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', width: '600px', zIndex: 20, padding: '16px 24px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
      <div className="eyebrow" style={{ marginBottom: '16px', color: 'white', textAlign: 'center' }}>3D SPATIAL + TEMPORAL INCIDENT VISUALIZATION</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '2px', background: 'rgba(255,255,255,0.2)', zIndex: 0 }} />
        
        {events.map((ev, idx) => (
          <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3b82f6', border: '3px solid #0f172a', marginBottom: '8px' }} />
            <div style={{ fontSize: '0.70rem', color: 'white', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>{ev.event_type.replace(/_/g, ' ').toUpperCase()}</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>{new Date(ev.timestamp).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
