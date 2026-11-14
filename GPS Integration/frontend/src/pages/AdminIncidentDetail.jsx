import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Timeline from '../components/Timeline';
import PriorityGauge from '../components/PriorityGauge';
import ReportGenerator from '../components/ReportGenerator';
import GeoVisionViewer from '../components/GeoVision/GeoVisionViewer';
import { 
  DashboardIcon, 
  ComplaintsIcon, 
  GeoVisionIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

// ── Sidebar Navigation (matches reference screenshot exactly) ─
function SidebarNav({ activePage }) {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, href: '/admin' },
    { id: 'complaints', label: 'Complaints', icon: <ComplaintsIcon />, href: '/admin' },
    { id: 'geovision', label: 'GeoVision', icon: <GeoVisionIcon />, href: '/admin' },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon />, href: '#' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, href: '#' },
  ];

  return (
    <aside className="jv-sidebar">
      {/* Brand */}
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

      {/* Navigation */}
      <nav className="jv-nav">
        {navItems.map(item => (
          <Link
            key={item.id}
            to={item.href}
            className={`jv-nav-item ${activePage === item.id ? 'jv-nav-item--active' : ''}`}
          >
            <span className="jv-nav-icon">{item.icon}</span>
            <span className="jv-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="jv-sidebar-bottom">
        <Link to="/" className="jv-nav-item jv-nav-logout">
          <span className="jv-nav-icon"><LogoutIcon /></span>
          <span className="jv-nav-label">Logout</span>
        </Link>
      </div>
    </aside>
  );
}

// ── Top Header ────────────────────────────────────────────────
function TopHeader({ breadcrumbs, incident }) {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="jv-topheader">
      <div className="jv-breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="jv-breadcrumb-item">
            {idx > 0 && <span className="jv-breadcrumb-sep">›</span>}
            {crumb.href ? <Link to={crumb.href}>{crumb.label}</Link> : <span className="jv-breadcrumb-current">{crumb.label}</span>}
          </span>
        ))}
      </div>
      <div className="jv-topheader-right">
        <div className="jv-notif-btn">
          🔔
          {incident && <span className="jv-notif-badge">3</span>}
        </div>
        <button className="jv-lang-selector" onClick={toggleLanguage}>
          {i18n.language === 'en' ? 'English' : 'हिंदी'} <span>▾</span>
        </button>
        <div className="jv-admin-badge">Administrator</div>
      </div>
    </header>
  );
}

// ── Status badge helper ───────────────────────────────────────
function StatusBadge({ status }) {
  const colorMap = {
    pending: { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
    open: { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
    in_progress: { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
    verified_resolved: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    breached: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  };
  const s = colorMap[status] || colorMap['pending'];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
      textTransform: 'capitalize', letterSpacing: '0.03em'
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── Mini Map (static placeholder with coordinates display) ────
function MiniMap({ incident }) {
  const lat = incident?.representative_lat || incident?.latitude;
  const lng = incident?.representative_lng || incident?.longitude;
  if (!lat || !lng) return null;

  return (
    <div className="jv-minimap">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <Marker position={[lat, lng]}>
          <Popup>{incident?.category || 'Complaint Location'}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AdminIncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showGeoVision, setShowGeoVision] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) setIncident(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    const interval = setInterval(fetchIncident, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, [id]);

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('evidence_type', 'after');
    formData.append('uploaded_by', 'admin_demo');
    try {
      await fetch(`/api/incidents/${id}/evidence`, { method: 'POST', body: formData });
      await fetchIncident();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const simulateSlaBreach = async () => {
    try {
      await fetch(`/api/admin/simulate-sla-breach/${id}`, { method: 'POST' });
      await fetchIncident();
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="jv-layout">
        <SidebarNav activePage="complaints" />
        <div className="jv-main-area">
          <div className="jv-loading-state">
            <div className="jv-loading-spinner" />
            <p>Loading Incident Details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="jv-layout">
        <SidebarNav activePage="complaints" />
        <div className="jv-main-area">
          <div className="jv-error-state">
            <span>⚠️</span>
            <p>Incident not found.</p>
            <button className="jv-btn jv-btn--primary" onClick={() => navigate('/admin')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const lat = incident.representative_lat || incident.latitude;
  const lng = incident.representative_lng || incident.longitude;
  const ward = incident.ward || incident.address || 'Unknown Ward';
  const reportedDate = incident.events?.[0]?.timestamp
    ? new Date(incident.events[0].timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  // ── GeoVision Full-Screen Mode ─────────────────────────────
  if (showGeoVision) {
    return (
      <div className="jv-layout">
        <SidebarNav activePage="geovision" />
        <div className="jv-main-area" style={{ padding: 0, overflow: 'hidden' }}>
          <GeoVisionViewer
            incident={incident}
            onClose={() => setShowGeoVision(false)}
            onDispatchBrief={async () => {
              navigate(`/admin/incident/${id}/assign`);
              return true;
            }}
          />
        </div>
      </div>
    );
  }

  // ── Normal Detail View ────────────────────────────────────
  return (
    <div className="jv-layout">
      <SidebarNav activePage="complaints" />

      <div className="jv-main-area">
        <TopHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Complaints', href: '/admin' },
            { label: 'Complaint Details' },
          ]}
          incident={incident}
        />

        {/* Page Title */}
        <div className="jv-page-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="jv-page-title">Complaint Details</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="jv-btn jv-btn--secondary" onClick={() => navigate(`/admin/incident/${id}/progress`)}>
              Track Progress
            </button>
            <button className="jv-btn jv-btn--secondary" onClick={() => navigate(`/admin/incident/${id}/verification`)}>
              Verification Status
            </button>
            <button className="jv-btn jv-btn--secondary" onClick={() => navigate('/admin')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="jv-detail-grid">
          {/* ── Card 1: Complaint Overview ──────────────────── */}
          <div className="jv-card jv-card--complaint-overview">
            <h2 className="jv-card-title">Complaint Overview</h2>
            <div className="jv-overview-table">
              <div className="jv-overview-row">
                <span className="jv-overview-label">Complaint ID</span>
                <span className="jv-overview-value jv-mono">CMP-{String(incident.id).slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Category</span>
                <span className="jv-overview-value jv-bold">{incident.category?.replace(/_/g, ' ')}</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Priority</span>
                <span className="jv-overview-value jv-bold" style={{ color: incident.priority_color || '#f97316' }}>
                  {incident.priority_label || incident.severity}
                </span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Status</span>
                <span className="jv-overview-value"><StatusBadge status={incident.status} /></span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Reported On</span>
                <span className="jv-overview-value">{reportedDate}</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Reported By</span>
                <span className="jv-overview-value">Citizen</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Department</span>
                <span className="jv-overview-value jv-bold">{incident.department || '—'}</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Impact Radius</span>
                <span className="jv-overview-value">{incident.impact_radius || 500}m</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">Linked Complaints</span>
                <span className="jv-overview-value">{incident.complaint_count}</span>
              </div>
            </div>
            {/* Priority Score */}
            <div className="jv-priority-row">
              <span className="jv-overview-label">Priority Score</span>
              <PriorityGauge score={incident.priority_score} />
            </div>
          </div>

          {/* ── Card 2: Location ──────────────────────────── */}
          <div className="jv-card jv-card--location">
            <h2 className="jv-card-title">
              <span className="jv-location-pin">📍</span> Location
            </h2>
            <div className="jv-location-address">
              <div className="jv-overview-label">ADDRESS</div>
              <div className="jv-location-addr-text">{ward}, City</div>
            </div>
            {lat && lng && (
              <div className="jv-location-coords">
                <div className="jv-overview-row">
                  <span className="jv-overview-label">Latitude</span>
                  <span className="jv-overview-value jv-mono">{lat.toFixed(4)}</span>
                </div>
                <div className="jv-overview-row">
                  <span className="jv-overview-label">Longitude</span>
                  <span className="jv-overview-value jv-mono">{lng.toFixed(4)}</span>
                </div>
              </div>
            )}
            <div className="jv-location-landmarks">
              <div className="jv-overview-row">
                <span className="jv-overview-label">Ward</span>
                <span className="jv-overview-value jv-bold">{ward}</span>
              </div>
              <div className="jv-overview-row">
                <span className="jv-overview-label">GPS Status</span>
                <span className="jv-overview-value" style={{ color: '#16a34a' }}>
                  ✓ {lat && lng ? 'GPS Verified' : 'Unavailable'}
                </span>
              </div>
            </div>
            {/* SLA */}
            <div className="jv-sla-row" style={{ borderColor: incident.sla_status === 'breached' ? '#ef4444' : '#e2e8f0' }}>
              <div>
                <div className="jv-overview-label">SLA Status</div>
                <div className="jv-sla-value" style={{ color: incident.sla_status === 'breached' ? '#ef4444' : '#16a34a' }}>
                  {incident.sla_status?.toUpperCase()}
                </div>
              </div>
              <button className="jv-btn jv-btn--ghost jv-btn--sm" onClick={simulateSlaBreach}>
                Simulate Breach
              </button>
            </div>
          </div>

          {/* ── Card 3: Mini Map + Open GeoVision ─────────── */}
          <div className="jv-card jv-card--map">
            <MiniMap incident={incident} />
            <div className="jv-map-info">
              {lat && lng && (
                <>
                  <div className="jv-overview-row">
                    <span className="jv-overview-label">Nearest Road</span>
                    <span className="jv-overview-value">Main Road</span>
                  </div>
                </>
              )}
            </div>
            <button
              className="jv-btn jv-btn--geovision"
              onClick={() => setShowGeoVision(true)}
            >
              <span>◎</span> Open GeoVision
            </button>
          </div>

          {/* ── Card 4: Description ───────────────────────── */}
          <div className="jv-card jv-card--description">
            <h2 className="jv-card-title">Complaint Description</h2>
            <p className="jv-description-text">{incident.description}</p>

            {/* Evidence Images */}
            {incident.evidence && incident.evidence.length > 0 && (
              <div className="jv-evidence-section">
                <div className="jv-overview-label" style={{ marginBottom: '10px' }}>
                  Uploaded Images ({incident.evidence.length})
                </div>
                <div className="jv-evidence-grid">
                  {incident.evidence.map((ev, idx) => (
                    <div key={ev.id || idx} className="jv-evidence-thumb">
                      <img src={ev.image_url} alt={`Evidence ${idx + 1}`} />
                      <div className="jv-evidence-type">{ev.type || `Photo ${idx + 1}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Resolution Evidence */}
            {incident.status !== 'verified_resolved' && (
              <div className="jv-upload-section">
                <div className="jv-overview-label" style={{ marginBottom: '8px' }}>Resolution Evidence</div>
                <label className="jv-btn jv-btn--upload">
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEvidenceUpload} disabled={uploading} />
                  {uploading ? '⏳ Uploading & Analyzing...' : '📷 Upload Repair Evidence'}
                </label>
              </div>
            )}
          </div>

          {/* ── Card 5: Timeline ──────────────────────────── */}
          <div className="jv-card jv-card--timeline">
            <h2 className="jv-card-title">Complaint Timeline</h2>
            <Timeline events={incident.events} />
          </div>

          {/* ── Card 6: Report Generator ──────────────────── */}
          <div className="jv-card jv-card--report">
            <ReportGenerator incident={incident} />
          </div>
        </div>
      </div>
    </div>
  );
}
