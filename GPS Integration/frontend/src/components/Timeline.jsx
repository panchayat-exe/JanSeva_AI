import React from 'react';

function formatEventTitle(type) {
  switch (type) {
    case 'created':
    case 'reported':
      return 'Report Logged';
    case 'assigned':
      return 'Assigned to Department & Engineer';
    case 'engineer_arrived':
      return 'Engineer Reached Location';
    case 'work_started':
      return 'Work Started';
    case 'repair_submitted':
    case 'work_completed':
      return 'Repair Work Completed';
    case 'ai_verified':
      return 'AI Verification Completed';
    case 'citizen_confirmed':
      return 'Citizen Confirmed Resolution';
    case 'citizen_rejected':
    case 'reopened':
      return 'Complaint Reopened by Citizen';
    case 'sla_warning':
      return 'SLA Warning Issued';
    case 'sla_breach':
      return 'SLA Deadline Breached';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

function formatActorName(actor, metadata) {
  if (!actor || actor === 'system') return 'System Auto-Engine';
  if (actor === 'admin') return 'Municipal Admin';
  if (actor === 'citizen') return 'Citizen User';
  if (actor.includes('engineer')) return metadata?.engineer_name ? `Engineer (${metadata.engineer_name})` : 'Assigned Field Engineer';
  return actor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatMetadataSummary(type, metadata) {
  if (!metadata) return null;

  // Handle formatted notes string if present
  if (typeof metadata === 'string') return metadata;

  // Specific event type formatting into clean human-readable sentences
  if (type === 'assigned') {
    const dept = metadata.department || metadata.team || 'Department';
    const notes = metadata.notes || '';
    if (notes.includes('Engineer:')) {
      return notes; // Format: Engineer: John | Emp ID: 123 | Dept: Water
    }
    return `Assigned to ${dept}`;
  }

  if (type === 'work_completed' || type === 'repair_submitted') {
    const notes = metadata.notes || 'Repair work completed on site by field team.';
    const confidence = metadata.confidence ? ` (Visual match confidence: ${Math.round(metadata.confidence * 100)}%)` : '';
    return `${notes}${confidence}`;
  }

  if (type === 'ai_verified') {
    const verdict = metadata.verdict ? metadata.verdict.replace(/_/g, ' ') : 'verified';
    const msg = metadata.message || `AI visual verification result: ${verdict}.`;
    const conf = metadata.cv_confidence || metadata.confidence;
    return conf ? `${msg} (Confidence: ${Math.round(conf * 100)}%)` : msg;
  }

  if (type === 'citizen_confirmed') {
    return 'Citizen confirmed that the issue was resolved to their satisfaction.';
  }

  if (type === 'citizen_rejected' || type === 'reopened') {
    const fb = metadata.feedback ? ` Feedback: "${metadata.feedback}"` : '';
    return `Citizen reported issue not resolved.${fb}`;
  }

  if (metadata.notes) {
    return metadata.notes;
  }

  // Generic key-value fallback (no JSON raw brackets)
  const entries = Object.entries(metadata).filter(([k]) => k !== 'raw');
  if (entries.length === 0) return null;

  return entries
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' • ');
}

export default function Timeline({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
      {events.map((event, index) => {
        const dateStr = new Date(event.timestamp || Date.now()).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let dotColor = '#3b82f6'; // blue default
        let dotBg = '#eff6ff';
        if (event.event_type.includes('breach') || event.event_type.includes('rejected') || event.event_type.includes('reopened')) {
          dotColor = '#ef4444';
          dotBg = '#fef2f2';
        } else if (event.event_type.includes('resolved') || event.event_type.includes('confirmed') || event.event_type.includes('completed')) {
          dotColor = '#22c55e';
          dotBg = '#f0fdf4';
        } else if (event.event_type.includes('assigned') || event.event_type.includes('verified')) {
          dotColor = '#6366f1';
          dotBg = '#eef2ff';
        }

        const title = formatEventTitle(event.event_type);
        const actor = formatActorName(event.actor, event.metadata);
        const summary = formatMetadataSummary(event.event_type, event.metadata);

        return (
          <div key={event.id || index} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {/* Vertical Connecting Line */}
            {index < events.length - 1 && (
              <div style={{
                position: 'absolute',
                top: '28px',
                left: '13px',
                bottom: '-20px',
                width: '2px',
                background: '#e2e8f0',
                zIndex: 0
              }} />
            )}

            {/* Dot Icon */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: dotBg,
              border: `2px solid ${dotColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 1,
              marginTop: '2px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
            </div>

            {/* Event Content Box */}
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {title}
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  {dateStr}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: summary ? '8px' : 0 }}>
                Logged by: <strong style={{ color: '#334155' }}>{actor}</strong>
              </div>

              {summary && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}>
                  {summary}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
