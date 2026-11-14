import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import * as Cesium from 'cesium';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { 
  DashboardIcon, 
  ComplaintsIcon, 
  GeoVisionIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

// ── Sidebar Nav (matches requested UI: Complaints & GeoVision only) ──
function SidebarNav({ activePage, onSelectTab }) {
  const { i18n } = useTranslation();

  const navItems = [
    { id: 'complaints', label: 'Complaints', icon: <ComplaintsIcon />, href: '/admin' },
    { id: 'geovision', label: 'GeoVision', icon: <GeoVisionIcon />, href: '/admin' },
  ];

  return (
    <aside className="jv-sidebar">
      <div className="jv-sidebar-brand">
        <div className="jv-emblem">
          <AshokaStambhaIcon width={34} height={34} />
        </div>
        <div className="jv-brand-text">
          <span className="jv-brand-name">JANSEVA AI</span>
          <span className="jv-brand-tagline">Your Voice. Our Action.</span>
        </div>
      </div>
      <div className="jv-sidebar-divider" />
      <nav className="jv-nav">
        {navItems.map(item => (
          <Link
            key={item.id}
            to={item.href}
            onClick={() => onSelectTab && onSelectTab(item.id)}
            className={`jv-nav-item ${activePage === item.id ? 'jv-nav-item--active' : ''}`}
          >
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

// ── Priority Badge ────────────────────────────────────────────
function PriBadge({ label, color }) {
  const colorMap = {
    '#ef4444': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
    '#f97316': { bg: 'rgba(249,115,22,0.1)', text: '#f97316' },
    '#eab308': { bg: 'rgba(234,179,8,0.1)', text: '#ca8a04' },
    '#22c55e': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  };
  const style = colorMap[color] || { bg: 'rgba(255,255,255,0.07)', text: '#94a3b8' };
  return (
    <span style={{
      background: style.bg, color: style.text,
      padding: '2px 8px', borderRadius: '99px',
      fontSize: '0.72rem', fontWeight: 700,
      textTransform: 'capitalize'
    }}>
      {label}
    </span>
  );
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const viewerRef = useRef(null);

  const [incidents, setIncidents] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewer, setViewer] = useState(null);
  const [isClustering, setIsClustering] = useState(false);
  const [activeView, setActiveView] = useState('geovision'); // 'geovision' | 'complaints'
  
  // Filter state for Complaints view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Fetch data
  const fetchData = async () => {
    try {
      const [incRes, statRes, compRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/stats'),
        fetch('/api/complaints')
      ]);
      if (incRes.ok) setIncidents(await incRes.json());
      if (statRes.ok) setStats(await statRes.json());
      if (compRes.ok) setComplaintsList(await compRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s (not 3s — was causing lag)
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize Cesium (Desktop)
  useEffect(() => {
    if (isMobile || !viewerRef.current || viewer) return;

    const v = new Cesium.Viewer(viewerRef.current, {
      animation: false, timeline: false, baseLayerPicker: false,
      geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, fullscreenButton: false,
      infoBox: false, selectionIndicator: false,
      requestRenderMode: true,          // Only re-render when scene changes
      maximumRenderTimeChange: Infinity,
      scene3DOnly: true,
    });

    v.scene.globe.enableLighting = false;
    v.scene.highDynamicRange = false;
    v.scene.fog.enabled = false;
    v.scene.postProcessStages.fxaa.enabled = false;
    if (window.devicePixelRatio > 1) v.resolutionScale = 0.85;

    const key = import.meta.env.VITE_GOOGLE_3D_TILES_API_KEY;
    if (key) {
      Cesium.GoogleMaps.defaultApiKey = key;
      Cesium.createGooglePhotorealistic3DTileset({ onlyUsingWithGoogleGeocoder: true })
        .then(tileset => { v.scene.primitives.add(tileset); v.scene.globe.show = false; })
        .catch(console.error);
    } else {
      v.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      }));
    }

    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(72.8777, 19.0760, 15000),
      duration: 0
    });

    setViewer(v);
    return () => { if (!v.isDestroyed()) v.destroy(); };
  }, [isMobile]);

  // Update Cesium Entities
  useEffect(() => {
    if (!viewer || incidents.length === 0) return;
    viewer.entities.removeAll();

    incidents.forEach(inc => {
      if (!inc.representative_lat) return;
      const position = Cesium.Cartesian3.fromDegrees(inc.representative_lng, inc.representative_lat, 10);
      const color = Cesium.Color.fromCssColorString(inc.priority_color || '#3b82f6');

      viewer.entities.add({
        id: `inc_${inc.id}`, position,
        point: { pixelSize: 16, color, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
        label: {
          text: `${inc.category} (${inc.priority_score})`,
          font: '14px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -24),
          fillColor: color, showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.7)
        }
      });

      if (inc.impact_radius) {
        viewer.entities.add({
          position,
          cylinder: {
            length: 50, topRadius: inc.impact_radius, bottomRadius: inc.impact_radius,
            material: color.withAlpha(0.2)
          }
        });
      }
    });

    // Force render frame since requestRenderMode is on
    viewer.scene.requestRender();
  }, [incidents, viewer]);

  const handleRunClustering = async () => {
    setIsClustering(true);
    try {
      await fetch('/api/incidents/cluster', { method: 'POST' });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setIsClustering(false); }
  };

  const handleIncidentClick = (id) => navigate(`/admin/incident/${id}`);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="jv-layout">
      <SidebarNav activePage={activeView} onSelectTab={setActiveView} />

      <div className="jv-main-area jv-main-area--nopad">
        {/* ── Top Header ──────────────────────────────────── */}
        <header className="jv-topheader">
          <div className="jv-breadcrumb">
            <span className="jv-breadcrumb-item">
              <span 
                className="jv-breadcrumb-current" 
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveView('dashboard')}
              >
                Dashboard
              </span>
            </span>
            {activeView === 'geovision' && (
              <span className="jv-breadcrumb-item">
                <span className="jv-breadcrumb-sep">›</span>
                <span className="jv-breadcrumb-current" style={{ color: '#f97316', textDecoration: 'underline' }}>
                  GeoVision
                </span>
              </span>
            )}
            {activeView === 'complaints' && (
              <span className="jv-breadcrumb-item">
                <span className="jv-breadcrumb-sep">›</span>
                <span className="jv-breadcrumb-current" style={{ color: '#f97316', textDecoration: 'underline' }}>
                  Complaints
                </span>
              </span>
            )}
          </div>
          <div className="jv-topheader-right">
            <div className="jv-notif-btn">🔔<span className="jv-notif-badge">3</span></div>
            <button className="jv-lang-selector" onClick={toggleLanguage}>
              {i18n.language === 'en' ? 'English' : 'हिंदी'} <span>▾</span>
            </button>
            <div className="jv-admin-badge">Administrator</div>
          </div>
        </header>

        {/* ── GeoVision View ───────────────────────────────── */}
        {activeView === 'geovision' && (
          <>
            {/* ── GeoVision Title ─────────────────────────────── */}
            <div className="jv-gv-title-bar">
              <div>
                <h1 className="jv-page-title">GeoVision</h1>
                <div className="jv-gv-subtitle">
                  {stats && (
                    <span>{stats.open_incidents} active incidents · {stats.total_complaints} total complaints</span>
                  )}
                </div>
              </div>
              <div className="jv-gv-actions">
                <button
                  className="jv-btn jv-btn--secondary jv-btn--sm"
                  onClick={handleRunClustering}
                  disabled={isClustering}
                >
                  {isClustering ? '⏳ Clustering...' : '⟳ Run DBSCAN Clustering'}
                </button>
              </div>
            </div>

            {/* ── Stats Row ────────────────────────────────────── */}
            {stats && (
              <div className="jv-stats-row">
                <div className="jv-stat-pill">
                  <span className="jv-stat-num">{stats.total_complaints}</span>
                  <span className="jv-stat-label">Total Complaints</span>
                </div>
                <div className="jv-stat-pill">
                  <span className="jv-stat-num" style={{ color: '#ef4444' }}>{stats.open_incidents}</span>
                  <span className="jv-stat-label">Open Incidents</span>
                </div>
                <div className="jv-stat-pill">
                  <span className="jv-stat-num" style={{ color: '#f97316' }}>{stats.critical_count || 0}</span>
                  <span className="jv-stat-label">Critical</span>
                </div>
                <div className="jv-stat-pill">
                  <span className="jv-stat-num" style={{ color: '#16a34a' }}>{stats.resolved_count || 0}</span>
                  <span className="jv-stat-label">Resolved</span>
                </div>
              </div>
            )}

            {/* ── Main Map + Pin Panel ─────────────────────────── */}
            <div className="jv-gv-workspace">
              {/* Map */}
              <div className="jv-gv-map-area">
                {!isMobile ? (
                  <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                    {incidents.map(inc => {
                      if (!inc.representative_lat) return null;
                      const pos = [inc.representative_lat, inc.representative_lng];
                      return (
                        <React.Fragment key={inc.id}>
                          <Marker position={pos} eventHandlers={{ click: () => handleIncidentClick(inc.id) }}>
                            <Popup>{inc.category} ({inc.priority_score})</Popup>
                          </Marker>
                          {inc.impact_radius && (
                            <Circle center={pos} radius={inc.impact_radius}
                              pathOptions={{ color: inc.priority_color, fillColor: inc.priority_color, fillOpacity: 0.15 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </MapContainer>
                )}

                {/* Leaflet map for desktop when Cesium off */}
                {!isMobile && !viewer && (
                  <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ position: 'absolute', inset: 0 }}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                    {incidents.map(inc => {
                      if (!inc.representative_lat) return null;
                      const pos = [inc.representative_lat, inc.representative_lng];
                      return (
                        <Marker key={inc.id} position={pos} eventHandlers={{ click: () => handleIncidentClick(inc.id) }}>
                          <Popup>{inc.category}</Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                )}

                {/* Map overlay label */}
                <div className="jv-map-overlay-label">
                  <span>SPATIAL INTELLIGENCE LAYER</span>
                  <span className="jv-map-live-dot" /> LIVE
                </div>
              </div>

              {/* Active Grievance Pins Panel (Real-Time Citizen Grievances) */}
              <div className="jv-gv-pins-panel">
                <div className="jv-pins-header">
                  <span className="jv-pins-icon">◎</span>
                  <h3 className="jv-pins-title">Active Grievance Pins</h3>
                </div>
                <div className="jv-pins-list">
                  {complaintsList.length === 0 && incidents.length === 0 && (
                    <div className="jv-pins-empty">No active complaints yet</div>
                  )}
                  {complaintsList.map(c => (
                    <div
                      key={c.id}
                      className="jv-pin-item"
                      onClick={() => c.incident_id ? handleIncidentClick(c.incident_id) : handleIncidentClick(c.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="jv-pin-item-main">
                        <div className="jv-pin-category" style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                          {c.category?.replace(/_/g, ' ') || 'Civic Issue'}
                        </div>
                        <div className="jv-pin-ward" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          📍 {c.ward || c.address || 'Vadodara Zone'}
                        </div>
                      </div>
                      <PriBadge 
                        label={c.severity || 'HIGH'} 
                        color={c.severity === 'critical' ? '#ef4444' : c.severity === 'high' ? '#f97316' : '#eab308'} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Complaints Table View (Matching Image 2 Reference) ─── */}
        {activeView === 'complaints' && (
          <div style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Complaints
              </h1>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Dashboard › <span style={{ color: '#f97316', fontWeight: 600, textDecoration: 'underline' }}>Complaints</span>
              </div>
            </div>

            {/* Filter Bar (Matching Screenshot 2) */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #f1f5f9',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by Complaint ID, Category, Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    fontSize: '0.88rem',
                    background: '#f8fafc'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.88rem', color: '#334155' }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.88rem', color: '#334155' }}
              >
                <option value="all">All Categories</option>
                <option value="pothole">Roads & Potholes</option>
                <option value="garbage">Garbage Collection</option>
                <option value="street_light">Street Lights</option>
                <option value="water_leak">Water Supply</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.88rem', color: '#334155' }}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <button style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #fed7aa',
                background: '#fff7ed',
                color: '#ea580c',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                📥 Export
              </button>
            </div>

            {/* Complaints Data Table (Matching Image 2 Screenshot) */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #f1f5f9',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  All Complaints ({complaintsList.length})
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Sort by</span>
                  <select style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem' }}>
                    <option>Latest</option>
                    <option>Oldest</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 16px' }}>COMPLAINT ID</th>
                      <th style={{ padding: '12px 16px' }}>CATEGORY</th>
                      <th style={{ padding: '12px 16px' }}>LOCATION</th>
                      <th style={{ padding: '12px 16px' }}>PRIORITY</th>
                      <th style={{ padding: '12px 16px' }}>STATUS</th>
                      <th style={{ padding: '12px 16px' }}>REPORTED ON</th>
                      <th style={{ padding: '12px 16px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaintsList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          No citizen complaints recorded yet. Submit a complaint from the citizen portal!
                        </td>
                      </tr>
                    ) : (
                      complaintsList.map(c => {
                        const compIdFormatted = c.id ? `CMP-2026-${c.id.split('-')[0].substring(0, 4)}` : 'CMP-2026';
                        const isHigh = c.severity === 'high' || c.severity === 'critical';
                        const isMedium = c.severity === 'medium';
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#0f172a' }}>
                              {compIdFormatted}
                            </td>
                            <td style={{ padding: '16px', textTransform: 'capitalize', color: '#334155' }}>
                              {c.category?.replace(/_/g, ' ') || 'Civic Issue'}
                            </td>
                            <td style={{ padding: '16px', color: '#475569' }}>
                              📍 {c.ward || c.address || 'Vadodara Zone'}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: isHigh ? '#ef4444' : isMedium ? '#f97316' : '#22c55e' }}>
                              {c.severity || 'Medium'}
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '99px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: c.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                                color: c.status === 'resolved' ? '#15803d' : '#b45309'
                              }}>
                                {c.status || 'Pending'}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: '#64748b' }}>
                              {c.created_at ? new Date(c.created_at).toLocaleString() : 'Just now'}
                            </td>
                            <td style={{ padding: '16px' }}>
                              <button
                                onClick={() => navigate(`/admin/incident/${c.incident_id || c.id}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                View Details →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="jv-footer">
          © 2026 Janseva AI Government Portal · Digital India Initiative. All rights reserved.
        </div>
      </div>
    </div>
  );
}
