import React from 'react';

export default function PriorityGauge({ score }) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  
  // Map 0-100 to rotation degrees (-45 to 135) for a half circle gauge (180 deg)
  // Or for full circle gauge map to 0-360.
  // Using a 180 degree half circle gauge rotated -45 deg for visual flair.
  // Wait, let's do a simple full circle fill (0 to 360) / 2
  
  const rotateAngle = -45 + (normalizedScore / 100) * 180;

  let color = 'var(--status-low)';
  if (normalizedScore >= 35) color = 'var(--status-medium)';
  if (normalizedScore >= 60) color = 'var(--status-high)';
  if (normalizedScore >= 80) color = 'var(--status-critical)';

  return (
    <div className="gauge-container">
      <div className="gauge-background"></div>
      <div 
        className="gauge-fill" 
        style={{ 
          transform: `rotate(${rotateAngle}deg)`,
          borderColor: color 
        }}
      ></div>
      <div className="gauge-value" style={{ color }}>{normalizedScore}</div>
    </div>
  );
}
