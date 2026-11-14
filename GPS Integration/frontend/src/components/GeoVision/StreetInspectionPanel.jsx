import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KartaViewProvider } from './KartaViewProvider';

/**
 * StreetInspectionPanel — Immersive street-level inspection view.
 * 
 * Features:
 * - Progressive search with radius indicator
 * - Mouse drag to pan image
 * - Scroll to zoom
 * - Sequence navigation (← Previous / Next →)
 * - Incident context overlay
 * - Professional fallback when no imagery available
 * - "CAPTURED STREET IMAGERY" — never "LIVE"
 */
export default function StreetInspectionPanel({ incident, searchResult, onClose }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const sequence = searchResult?.sequencePhotos || [];
  const currentPhoto = sequence[currentIndex];

  // Find the closest photo index in the sequence
  useEffect(() => {
    if (searchResult?.closestPhoto && sequence.length > 0) {
      const idx = sequence.findIndex(p => p.id === searchResult.closestPhoto.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    }
  }, [searchResult, sequence]);

  // Reset pan/zoom when photo changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex]);

  // ── Mouse Drag (Pan) ──
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Scroll Zoom ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.5, Math.min(4, prev + delta));
    });
  }, []);

  // ── Recenter ──
  const handleRecenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < sequence.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, sequence.length, onClose]);

  if (!currentPhoto) return null;

  return (
    <div className="gv-street-panel">
      {/* ── Header ── */}
      <div className="gv-street-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2>GEOVISION <span>| STREET INTELLIGENCE</span></h2>
          <div className="gv-street-captured-label">
            📷 CAPTURED STREET IMAGERY
          </div>
        </div>
        <button className="btn btn-primary" onClick={onClose}>
          ↗ Return to Aerial
        </button>
      </div>

      {/* ── Image Viewport ── */}
      <div
        ref={viewportRef}
        className="gv-street-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Loading indicator for image */}
        {!imageLoaded && !imageError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', fontSize: '0.9rem', gap: '12px'
          }}>
            <div className="brand-icon" style={{ width: 32, height: 32, fontSize: 14, animation: 'pulse-ring 2s infinite' }}>J</div>
            <span>Loading imagery...</span>
          </div>
        )}

        {imageError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#94a3b8'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <span>Image failed to load</span>
            <button className="btn btn-secondary" onClick={() => {
              setImageError(false);
              setImageLoaded(false);
            }}>Retry</button>
          </div>
        )}

        <img
          src={currentPhoto.urlHighRes || currentPhoto.url}
          alt="Captured street imagery"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            opacity: imageLoaded ? 1 : 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Try low-res fallback
            if (e.target.src !== currentPhoto.url && currentPhoto.url) {
              e.target.src = currentPhoto.url;
            } else {
              setImageError(true);
            }
          }}
          draggable={false}
        />

        {/* ── Navigation Bar ── */}
        <div className="gv-street-nav">
          <button
            className="btn btn-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            ← Previous
          </button>

          <div className={`gv-street-distance-badge ${currentPhoto.distance < 100 ? 'near' : 'far'}`}>
            📍 {currentPhoto.distance}m
          </div>

          <div className="gv-street-nav-counter">
            {currentIndex + 1} / {sequence.length}
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleRecenter}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            ⌖
          </button>

          <button
            className="btn btn-secondary"
            disabled={currentIndex === sequence.length - 1}
            onClick={() => setCurrentIndex(prev => prev + 1)}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Context Panel (Right Side) ── */}
      <div className="gv-street-context">
        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Incident</div>
          <div className="gv-street-context-value">{incident.category}</div>
          <div style={{ color: incident.priority_color || '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
            {incident.severity?.toUpperCase()}
          </div>
        </div>

        <div className="gv-street-context-divider" />

        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Location</div>
          <div className="gv-street-context-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
            {incident.representative_lat?.toFixed(4)}, {incident.representative_lng?.toFixed(4)}
          </div>
        </div>

        <div className="gv-street-context-divider" />

        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Distance from Incident</div>
          <div className="gv-street-context-value" style={{ color: currentPhoto.distance < 100 ? '#10b981' : '#fbbf24' }}>
            {currentPhoto.distance}m away
          </div>
        </div>

        <div className="gv-street-context-divider" />

        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Capture Date</div>
          <div className="gv-street-context-value">
            {currentPhoto.shotDate
              ? new Date(currentPhoto.shotDate).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long'
                })
              : 'Date unknown'
            }
          </div>
        </div>

        <div className="gv-street-context-divider" />

        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Source</div>
          <div className="gv-street-context-value" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            KartaView (OpenStreetCam)
          </div>
          {currentPhoto.sequenceId && (
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
              Sequence: {currentPhoto.sequenceId}
            </div>
          )}
        </div>

        <div className="gv-street-context-divider" />

        <div className="gv-street-context-section">
          <div className="gv-street-context-label">Impact Radius</div>
          <div className="gv-street-context-value">
            {incident.impact_radius || 500}m
          </div>
        </div>
      </div>
    </div>
  );
}
