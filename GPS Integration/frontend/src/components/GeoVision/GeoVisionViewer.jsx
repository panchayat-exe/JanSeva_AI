import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GeoVision.css';

import ViewControls from './ViewControls';
import AnalysisPanel from './AnalysisPanel';
import TimelineControl from './TimelineControl';
import EvidencePanel from './EvidencePanel';
import StreetInspectionPanel from './StreetInspectionPanel';
import { GeoVisionCameraController } from './GeoVisionCameraController';
import { GeoVisionImageryManager } from './GeoVisionImageryManager';
import { ErrorBoundary } from './ErrorBoundary';
import { KartaViewProvider } from './KartaViewProvider';
import { locationIntelligence } from '../../services/geospatial/locationIntelligence';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component for Leaflet map recentering (only when target coords explicitly change)
function MapFlyTo({ center }) {
  const map = useMap();
  const lastCenter = useRef(null);

  useEffect(() => {
    if (!center) return;
    const key = `${center[0]}_${center[1]}`;
    if (lastCenter.current === key) return; // Prevent re-flying when user is dragging/panning
    lastCenter.current = key;

    map.flyTo(center, Math.max(map.getZoom(), 16), { animate: true, duration: 0.2 });
  }, [center, map]);
  return null;
}

// Map Click Handler for Instant Re-analysis
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

const GEO_MODES = {
  LOADING: 'LOADING',
  MAP_2D: 'MAP_2D',
  MAP_3D: 'MAP_3D',
  SEARCHING_STREET: 'SEARCHING_STREET',
  STREET: 'STREET',
  STREET_FALLBACK: 'STREET_FALLBACK',
};

function GeoVisionViewerInternal({ incident, onClose }) {
  const viewerRef = useRef(null);               
  const cesiumViewer = useRef(null);             
  const cameraController = useRef(null);         
  const imageryManager = useRef(null);           
  const viewerReady = useRef(false);             
  const lastQuerySignature = useRef(null);           
  const streetSearchAbort = useRef(null);        

  const [mode, setMode] = useState(GEO_MODES.MAP_2D);
  const [error, setError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null);
  const [streetSearchResult, setStreetSearchResult] = useState(null);

  const [selectedCoords, setSelectedCoords] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceStatus, setIntelligenceStatus] = useState('idle');

  const [viewModes, setViewModes] = useState({
    satellite: true,
    impact: true,
    clusters: false,
    heatmap: false,
    infrastructure: true,
    timeline: false,
    evidence: false,
  });

  const baseLat = incident?.representative_lat || incident?.latitude;
  const baseLng = incident?.representative_lng || incident?.longitude;
  const isValidCoords = typeof baseLat === 'number' && typeof baseLng === 'number' && baseLat >= -90 && baseLat <= 90 && baseLng >= -180 && baseLng <= 180;
  const radius = incident?.impact_radius || 500;

  const lat = selectedCoords ? selectedCoords.lat : baseLat;
  const lng = selectedCoords ? selectedCoords.lng : baseLng;

  // ────────────────────────────────────────────────────────────
  // 1. LIFECYCLE: Create Cesium Viewer ONCE on mount
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewerRef.current || cesiumViewer.current) return;

    try {
      const viewer = new Cesium.Viewer(viewerRef.current, {
        terrainProvider: undefined,
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        scene3DOnly: true, // We use Leaflet for 2D, Cesium only for 3D
        shouldAnimate: false,
        baseLayer: false, 
        // ── Performance Optimizations ──
        requestRenderMode: true, // Only render when scene changes
        maximumRenderTimeChange: Infinity,
        targetFrameRate: 60, // Smooth panning
      });

      // Downscale resolution for better performance on high-DPI (Retina) screens
      if (window.devicePixelRatio > 1) {
        viewer.resolutionScale = 1.0 / window.devicePixelRatio; 
      } else {
        viewer.resolutionScale = 0.8; // Minor downgrade for older PCs
      }
      
      // Disable heavy anti-aliasing
      viewer.scene.postProcessStages.fxaa.enabled = false;

      const creditContainer = viewer.bottomContainer;
      if (creditContainer) creditContainer.style.display = 'none';

      viewer.scene.globe.enableLighting = false;
      viewer.scene.highDynamicRange = false;
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0001;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.globe.showWaterEffect = false;
      
      // Prevent zooming too far in or out (causes errors/lag)
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100; // meters
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000; // meters

      cesiumViewer.current = viewer;
      cameraController.current = new GeoVisionCameraController(viewer);
      imageryManager.current = new GeoVisionImageryManager(viewer);

      imageryManager.current.initialize().catch(err => console.warn(err));
      viewerReady.current = true;

    } catch (e) {
      console.error('Cesium Viewer Initialization Error:', e);
    }

    return () => {
      if (streetSearchAbort.current) streetSearchAbort.current.abort();
      if (cesiumViewer.current && !cesiumViewer.current.isDestroyed()) {
        cesiumViewer.current.destroy();
      }
      cesiumViewer.current = null;
    };
  }, []);

  // ────────────────────────────────────────────────────────────
  // 2. INCIDENT & INTELLIGENCE HANDLING
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!incident) return;

    if (!isValidCoords) {
      setError('Incident coordinates unavailable.');
      return;
    }

    const evidenceHash = incident.evidence?.map(e => e.id || e.url || '').join('|') || 'no_ev';
    const signature = `${incident.id}_${lat}_${lng}_${evidenceHash}`;
    if (lastQuerySignature.current === signature) return;
    lastQuerySignature.current = signature;

    setStreetSearchResult(null);
    setIntelligence(null);
    setIntelligenceStatus('loading');

    // Fetch location intelligence asynchronously so it doesn't block rendering
    locationIntelligence.analyzeLocation(incident, selectedCoords, (progress) => {
      if (lastQuerySignature.current !== signature) return; // Stale request

      if (progress.stage === 'complete') {
        setIntelligence(progress.result);
        setIntelligenceStatus('complete');
        updateCesiumScene(incident, progress.result);
      } else if (progress.stage === 'error') {
        setIntelligenceStatus('error');
      }
    });

  }, [incident, selectedCoords, isValidCoords, lat, lng]);

  // ────────────────────────────────────────────────────────────
  // 3. UPDATE CESIUM SCENE
  // ────────────────────────────────────────────────────────────
  const updateCesiumScene = (inc, intelResult) => {
    const v = cesiumViewer.current;
    if (!v || v.isDestroyed()) return;

    v.entities.removeAll();

    // Original Incident Marker (Red)
    v.entities.add({
      id: `gv_marker_${inc.id}`,
      position: Cesium.Cartesian3.fromDegrees(baseLng, baseLat, 50),
      point: { pixelSize: 12, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: `INCIDENT: ${inc.category}\n${(inc.severity || '').toUpperCase()}`, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -20), fillColor: Cesium.Color.WHITE, showBackground: true, backgroundColor: new Cesium.Color(0.8, 0.1, 0.1, 0.9), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      polyline: { positions: [Cesium.Cartesian3.fromDegrees(baseLng, baseLat, 0), Cesium.Cartesian3.fromDegrees(baseLng, baseLat, 50)], width: 3, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.2, color: Cesium.Color.RED }), disableDepthTestDistance: Number.POSITIVE_INFINITY }
    });

    // Selected Target Marker (Blue)
    if (intelResult.target.isCustomLocation) {
      v.entities.add({
        id: `gv_target_${inc.id}`,
        position: Cesium.Cartesian3.fromDegrees(intelResult.target.lng, intelResult.target.lat, 50),
        point: { pixelSize: 12, color: Cesium.Color.DODGERBLUE, outlineColor: Cesium.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: `SELECTED LOCATION`, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -20), fillColor: Cesium.Color.WHITE, showBackground: true, backgroundColor: new Cesium.Color(0.1, 0.4, 0.8, 0.9), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        polyline: { positions: [Cesium.Cartesian3.fromDegrees(intelResult.target.lng, intelResult.target.lat, 0), Cesium.Cartesian3.fromDegrees(intelResult.target.lng, intelResult.target.lat, 50)], width: 3, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.2, color: Cesium.Color.DODGERBLUE }), disableDepthTestDistance: Number.POSITIVE_INFINITY }
      });
    }

    // Impact Zone centers on the current active target
    v.entities.add({
      id: `gv_impact_${inc.id}`,
      position: Cesium.Cartesian3.fromDegrees(intelResult.target.lng, intelResult.target.lat, 0),
      ellipse: { semiMinorAxis: radius, semiMajorAxis: radius, material: new Cesium.Color(0.2, 0.5, 1.0, 0.1), outline: true, outlineColor: Cesium.Color.DODGERBLUE.withAlpha(0.5), height: 0, classificationType: Cesium.ClassificationType.TERRAIN },
      show: viewModes.impact,
    });

    // Infrastructure
    intelResult.infrastructure.forEach(item => {
      let color = Cesium.Color.GRAY;
      if (item.category === 'Healthcare') color = Cesium.Color.DEEPPINK;
      else if (item.category === 'Education') color = Cesium.Color.CORNFLOWERBLUE;
      else if (item.category === 'Emergency') color = Cesium.Color.RED;

      v.entities.add({
        id: item.id,
        position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 2),
        point: { pixelSize: item.critical ? 10 : 8, color, outlineColor: Cesium.Color.WHITE, outlineWidth: item.critical ? 2 : 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: item.type, font: '10px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -15), fillColor: color, showBackground: true, backgroundColor: new Cesium.Color(0, 0, 0, 0.7), disableDepthTestDistance: Number.POSITIVE_INFINITY }
      });
    });

    // Related Complaints
    if (inc.complaints) {
      inc.complaints.forEach(comp => {
        if (comp.id === inc.id || !comp.longitude || !comp.latitude) return;
        v.entities.add({
          id: `gv_cluster_${comp.id}`,
          position: Cesium.Cartesian3.fromDegrees(comp.longitude, comp.latitude, 20),
          point: { pixelSize: 10, color: Cesium.Color.ORANGE, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { text: `Related: ${comp.category}`, font: '10px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -15), fillColor: Cesium.Color.ORANGE, showBackground: true, backgroundColor: new Cesium.Color(0, 0, 0, 0.7), disableDepthTestDistance: Number.POSITIVE_INFINITY },
          show: viewModes.clusters,
        });
      });
    }

    if (cameraController.current) {
      cameraController.current.reset();
      // Temporarily mock an incident-like object with the target coordinates for the camera to recenter properly
      cameraController.current.positionCameraForIncident({ 
        representative_lat: intelResult.target.lat, 
        representative_lng: intelResult.target.lng 
      }, true);
    }
    
    // Force a render frame since requestRenderMode is enabled
    v.scene.requestRender();
  };

  // ────────────────────────────────────────────────────────────
  // 4. STREET VIEW
  // ────────────────────────────────────────────────────────────
  const handleEnterStreetView = useCallback(async () => {
    if (!incident || !isValidCoords) return;

    if (streetSearchAbort.current) streetSearchAbort.current.abort();
    const abortController = new AbortController();
    streetSearchAbort.current = abortController;

    setMode(GEO_MODES.SEARCHING_STREET);
    setSearchRadius(null);
    setStreetSearchResult(null);

    try {
      const result = await KartaViewProvider.searchNearbyImagery(lat, lng, {
        maxRadius: 1000,
        signal: abortController.signal,
        onRadiusChange: (r) => setSearchRadius(r),
      });

      if (result.cancelled) return;

      if (result.found && result.sequencePhotos.length > 0) {
        setStreetSearchResult(result);
        setMode(GEO_MODES.STREET);
      } else {
        setStreetSearchResult(null);
        setMode(GEO_MODES.STREET_FALLBACK);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMode(GEO_MODES.STREET_FALLBACK);
    }
  }, [incident, isValidCoords, lat, lng]);

  const handleDispatchBrief = useCallback(async () => {
    if (!incident || !intelligence) return false;
    try {
      const formData = new URLSearchParams();
      formData.append('team', intelligence.recommendation?.department || incident.department || 'Municipal Corporation');
      formData.append('department', intelligence.recommendation?.department || incident.department || 'Municipal Corporation');
      const res = await fetch(`/api/incidents/${incident.id}/assign`, { method: 'POST', body: formData });
      return res.ok;
    } catch {
      return false;
    }
  }, [incident, intelligence]);

  const isMapMode = mode === GEO_MODES.MAP_2D || mode === GEO_MODES.MAP_3D;
  const is3D = mode === GEO_MODES.MAP_3D;

  return (
    <div className="gv-root" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ── Top Bar ── */}
      {(isMapMode || mode === GEO_MODES.SEARCHING_STREET) && (
        <div className="gv-topbar" style={{ zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div className="gv-topbar-brand">
            <div className="brand-icon">J</div>
            <div>
              <h2>GeoVision</h2>
              <div className="gv-subtitle">Civic Spatial Intelligence</div>
            </div>
          </div>
          <div className="gv-topbar-actions">
            <div className="gv-scene-toggle">
              <button className={`btn ${!is3D ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode(GEO_MODES.MAP_2D)}>
                2D MAP
              </button>
              <button className={`btn ${is3D ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode(GEO_MODES.MAP_3D)}>
                SATELLITE VIEW
              </button>
            </div>
            <button className="btn btn-secondary" onClick={() => {
              setSelectedCoords(null);
              if (is3D && cameraController.current) cameraController.current.positionCameraForIncident(incident, true);
            }}>⌖ Reset Origin</button>
            <button className="btn btn-primary" onClick={onClose}>Close Viewer</button>
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0e17', color: 'white', gap: '16px', zIndex: 2000 }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <span>{error}</span>
          <button className="btn btn-primary" onClick={onClose}>Return to Dashboard</button>
        </div>
      )}

      {/* ── 2D Map Engine (Leaflet) ── */}
      {mode === GEO_MODES.MAP_2D && isValidCoords && (
        <div className="gv-2d-container" style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: '#0a0e17', cursor: 'grab' }}>
          <MapContainer 
            center={[baseLat, baseLng]} 
            zoom={16} 
            maxZoom={21}
            style={{ height: '100%', width: '100%' }} 
            zoomControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              maxNativeZoom={18}
              maxZoom={21}
            />
            <MapFlyTo center={[lat, lng]} />
            <MapClickHandler onMapClick={setSelectedCoords} />
            
            {/* Original Incident Marker */}
            <Marker position={[baseLat, baseLng]}>
              <Popup><strong>{incident.category}</strong><br/>ORIGIN</Popup>
            </Marker>

            {/* Selected Location Marker (Blueish circle) */}
            {selectedCoords && (
              <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ color: 'dodgerblue', fillColor: 'dodgerblue', fillOpacity: 0.8 }}>
                <Popup><strong>Selected Location</strong></Popup>
              </CircleMarker>
            )}
            
            {/* Impact Zone (Centers on active target) */}
            {viewModes.impact && <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: selectedCoords ? 'dodgerblue' : 'red', fillColor: selectedCoords ? 'dodgerblue' : 'red', fillOpacity: 0.1 }} />}
            
            {viewModes.infrastructure && intelligence?.infrastructure?.map(inf => {
              const infColor = inf.category === 'Healthcare' ? 'deeppink' : inf.category === 'Education' ? 'cornflowerblue' : inf.category === 'Emergency' ? 'red' : 'gray';
              return (
                <CircleMarker key={inf.id} center={[inf.lat, inf.lng]} radius={inf.critical ? 6 : 4} pathOptions={{ color: infColor, fillColor: infColor, fillOpacity: 0.8 }}>
                  <Popup>{inf.type}</Popup>
                </CircleMarker>
              );
            })}

            {viewModes.clusters && incident.complaints?.map(comp => (
              comp.id !== incident.id && comp.latitude ? (
                <CircleMarker key={comp.id} center={[comp.latitude, comp.longitude]} radius={5} pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.8 }}>
                  <Popup>Related: {comp.category}</Popup>
                </CircleMarker>
              ) : null
            ))}
          </MapContainer>
        </div>
      )}

      {/* ── 3D Map Engine (Cesium) ── */}
      <div
        ref={viewerRef}
        className="gv-cesium-container"
        style={{ 
          position: 'absolute', inset: 0, zIndex: 2,
          visibility: mode === GEO_MODES.MAP_3D ? 'visible' : 'hidden',
          pointerEvents: mode === GEO_MODES.MAP_3D ? 'auto' : 'none',
          backgroundColor: '#0a0e17'
        }}
      />

      {/* ── UI Overlays (Analysis Panel) ── */}
      {isMapMode && incident && (
        <div style={{ zIndex: 1000, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <AnalysisPanel
            incident={incident}
            intelligence={intelligence}
            intelligenceStatus={intelligenceStatus}
            onEnterStreetView={handleEnterStreetView}
            onDispatchBrief={handleDispatchBrief}
          />
          <ViewControls
            modes={viewModes}
            setModes={setViewModes}
            onEnterStreetView={handleEnterStreetView}
            intelligence={intelligence}
          />
          {viewModes.timeline && <TimelineControl events={incident.events} />}
          {viewModes.evidence && <EvidencePanel evidence={incident.evidence} />}
        </div>
      )}

      {/* ── Street Search Transition ── */}
      {mode === GEO_MODES.SEARCHING_STREET && (
        <div className="gv-street-transition" style={{ zIndex: 2000 }}>
          <div className="gv-search-radius">
            <div className="gv-search-radius-ring">
              <span className="gv-search-radius-value">{searchRadius ? `${searchRadius}m` : '...'}</span>
            </div>
            <div className="gv-search-status">SEARCHING STREET IMAGERY</div>
            <div className="gv-search-label">Locating captured imagery near selected location</div>
            <button className="btn btn-secondary" onClick={() => setMode(GEO_MODES.MAP_2D)} style={{ marginTop: '16px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Street View Modes ── */}
      {mode === GEO_MODES.STREET && streetSearchResult && incident && (
        <StreetInspectionPanel incident={incident} searchResult={streetSearchResult} onClose={() => setMode(GEO_MODES.MAP_2D)} />
      )}
      {mode === GEO_MODES.STREET_FALLBACK && (
        <div className="gv-street-fallback" style={{ zIndex: 2000 }}>
          <div className="gv-street-fallback-card">
            <h3>STREET-LEVEL INSPECTION</h3>
            <p>NO PUBLIC STREET-LEVEL IMAGERY AVAILABLE</p>
            <button className="btn btn-primary" onClick={() => setMode(GEO_MODES.MAP_2D)}>← RETURN TO 2D MAP</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeoVisionViewer(props) {
  return (
    <ErrorBoundary onClose={props.onClose}>
      <GeoVisionViewerInternal {...props} />
    </ErrorBoundary>
  );
}
