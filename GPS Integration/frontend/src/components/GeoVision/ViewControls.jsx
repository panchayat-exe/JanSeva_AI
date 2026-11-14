import React from 'react';

/**
 * ViewControls — Layer toggles.
 */
export default function ViewControls({ modes, setModes }) {
  const toggleMode = (mode) => {
    setModes(prev => ({ ...prev, [mode]: !prev[mode] }));
  };

  const layers = [
    { key: 'satellite',  icon: '🛰️', label: 'SATELLITE', color: '#3b82f6' },
    { key: 'impact',     icon: '🔥', label: 'IMPACT',    color: '#ef4444' },
    { key: 'clusters',   icon: '🧩', label: 'CLUSTERS',  color: '#f59e0b' },
    { key: 'heatmap',    icon: '🗺️', label: 'HEATMAP',   color: '#ec4899' },
    { key: 'infrastructure', icon: '🏛️', label: 'INFRASTRUCTURE', color: '#10b981' },
  ];

  const overlays = [
    { key: 'timeline',   icon: '🕐', label: 'TIMELINE',  color: '#8b5cf6' },
    { key: 'evidence',   icon: '📷', label: 'EVIDENCE',  color: '#6366f1' },
  ];

  return (
    <div className="gv-controls-bar">
      {/* Layer toggles */}
      {layers.map(layer => (
        <button
          key={layer.key}
          className={`gv-control-btn ${modes[layer.key] ? 'active' : ''}`}
          style={modes[layer.key] ? {
            '--color': layer.color,
            '--bg': `${layer.color}20`
          } : undefined}
          onClick={() => toggleMode(layer.key)}
        >
          {layer.icon} {layer.label}
        </button>
      ))}

      <div className="gv-controls-divider" />

      {/* Overlay toggles */}
      {overlays.map(layer => (
        <button
          key={layer.key}
          className={`gv-control-btn ${modes[layer.key] ? 'active' : ''}`}
          style={modes[layer.key] ? {
            '--color': layer.color,
            '--bg': `${layer.color}20`
          } : undefined}
          onClick={() => toggleMode(layer.key)}
        >
          {layer.icon} {layer.label}
        </button>
      ))}
    </div>
  );
}

