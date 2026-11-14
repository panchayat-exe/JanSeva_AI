import { useEffect, useRef, useState } from "react";
import {
  X,
  Target,
  Globe,
  BarChart2,
  Building2,
  Clock,
  ImageIcon,
  Satellite,
  Layers,
  Crosshair,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import api, { SERVER_URL } from "@/lib/api";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ComplaintGeoViewerProps {
  complaint: any;
  open: boolean;
  onClose: () => void;
}

type ViewMode = "2d" | "satellite";
type ActiveTool = "none" | "impact" | "clusters" | "heatmap" | "infrastructure" | "timeline" | "evidence";

// ─── Constants ────────────────────────────────────────────────────────────────
const IMPACT_RADIUS: Record<string, number> = { High: 1000, Medium: 500, Low: 250 };
const PRIORITY_COLOR: Record<string, string> = {
  High: "#ef4444", CRITICAL: "#ef4444",
  Medium: "#f97316",
  Low: "#6b7280",
};

// Infrastructure category definitions
interface InfraCategory {
  key: string;
  label: string;
  color: string;
  fillColor: string;
  count: number;
}

const INFRA_CATEGORIES: Omit<InfraCategory, "count">[] = [
  { key: "hospital",   label: "Hospitals",       color: "#dc2626", fillColor: "#fca5a5" },
  { key: "school",     label: "Schools",          color: "#7c3aed", fillColor: "#c4b5fd" },
  { key: "water",      label: "Water Assets",     color: "#0284c7", fillColor: "#7dd3fc" },
  { key: "office",     label: "Govt / Offices",   color: "#0f766e", fillColor: "#5eead4" },
  { key: "road",       label: "Road Segments",    color: "#92400e", fillColor: "#fcd34d" },
  { key: "building",   label: "Buildings",        color: "#1e3a5f", fillColor: "#93c5fd" },
];

// ─── Layer refs ───────────────────────────────────────────────────────────────
interface LeafletLayers {
  osm?: any; satellite?: any; impact?: any; clusters?: any; heat?: any; infraGroup?: any;
}

// ─── Theme ───────────────────────────────────────────────────────────────────
function makeTheme(dark: boolean) {
  return dark
    ? {
        appBg: "#0f172a",
        sidebarBg: "#111827",
        toolbarBg: "#0f172a",
        headerBg: "#0f172a",
        text: "#f1f5f9",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.3)",
        border: "rgba(255,255,255,0.1)",
        cardBg: "rgba(255,255,255,0.05)",
        btnBorder: "rgba(255,255,255,0.18)",
        sectionLabel: "rgba(255,255,255,0.28)",
        popupBg: "rgba(15,23,42,0.96)",
        noticeText: "rgba(255,255,255,0.7)",
      }
    : {
        appBg: "#f8fafc",
        sidebarBg: "#ffffff",
        toolbarBg: "#f1f5f9",
        headerBg: "#ffffff",
        text: "#0f172a",
        textMuted: "#475569",
        textFaint: "#94a3b8",
        border: "rgba(0,0,0,0.08)",
        cardBg: "#f8fafc",
        btnBorder: "rgba(0,0,0,0.14)",
        sectionLabel: "#94a3b8",
        popupBg: "rgba(255,255,255,0.97)",
        noticeText: "#0f172a",
      };
}

// ─── Nominatim geocoder (module-level cache) ──────────────────────────────────
const geocodeCache = new Map<string, any>();
async function reverseGeocode(lat: number, lng: number): Promise<any> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    geocodeCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

// ─── Coordinate validation ────────────────────────────────────────────────────
function validateCoords(lat: any, lng: any): [number, number] | null {
  const la = parseFloat(String(lat)), ln = parseFloat(String(lng));
  if (isNaN(la) || isNaN(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return [la, ln];
}

// ─── CDN loaders ──────────────────────────────────────────────────────────────
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const el = document.createElement("script");
    el.id = id; el.src = src;
    el.onload = () => resolve(); el.onerror = reject;
    document.head.appendChild(el);
  });
}
function loadLink(href: string, id: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("link");
  el.id = id; el.rel = "stylesheet"; el.href = href;
  document.head.appendChild(el);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripEmojis(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
}

// Estimate building floors from OSM tags
function estimateLevels(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null;
  const lvl = parseInt(tags["building:levels"] ?? "");
  if (!isNaN(lvl) && lvl > 0) return lvl;
  const ht = parseFloat(tags["height"] ?? tags["building:height"] ?? "");
  if (!isNaN(ht) && ht > 0) return Math.max(1, Math.round(ht / 3));
  const type = (tags["building"] ?? "").toLowerCase();
  const estimates: Record<string, number> = {
    house: 2, residential: 3, apartments: 5, commercial: 4,
    retail: 2, office: 6, industrial: 1, warehouse: 1,
    school: 2, hospital: 4, hotel: 6, church: 1, mosque: 1, temple: 1,
  };
  return estimates[type] ?? null;
}

// Classify OSM element into infrastructure category
function classifyElement(tags: Record<string, string> | undefined): string {
  if (!tags) return "building";
  const amenity = (tags["amenity"] ?? "").toLowerCase();
  const building = (tags["building"] ?? "").toLowerCase();
  const highway = tags["highway"];
  const waterway = tags["waterway"];
  const manMade = tags["man_made"] ?? "";

  if (amenity === "hospital" || amenity === "clinic" || amenity === "doctors" || building === "hospital") return "hospital";
  if (amenity === "school" || amenity === "college" || amenity === "university" || building === "school") return "school";
  if (waterway || amenity === "water" || manMade === "water_tower" || manMade === "water_works") return "water";
  if (amenity === "government" || amenity === "police" || amenity === "fire_station" || building === "office" || building === "government") return "office";
  if (highway) return "road";
  return "building";
}

// Format a proper address from Nominatim parts
function buildAddress(geocodeData: any): string {
  if (!geocodeData) return "";
  const a = geocodeData.address ?? {};
  const parts = [
    a.house_number && a.road ? `${a.house_number}, ${a.road}` : a.road || "",
    a.suburb || a.neighbourhood || a.quarter || "",
    a.city || a.town || a.municipality || a.village || "",
    a.state || "",
    a.postcode || "",
  ].filter(Boolean);
  return parts.join(", ") || geocodeData.display_name || "";
}

// Impact area in km²
function impactArea(radiusM: number): string {
  return (Math.PI * radiusM * radiusM / 1_000_000).toFixed(2);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ComplaintGeoViewer({ complaint, open, onClose }: ComplaintGeoViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<LeafletLayers>({});

  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [activeTool, setActiveTool] = useState<ActiveTool>("none");
  const [mapReady, setMapReady] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [infraStatus, setInfraStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [infraCounts, setInfraCounts] = useState<Record<string, number>>({});
  const [geocodeData, setGeocodeData] = useState<any>(null);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [dataFetchedAt] = useState(() => new Date());
  // Timeline & media – fetched on demand
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [mediaData, setMediaData] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const T = makeTheme(isDark);
  const coords = validateCoords(complaint?.latitude, complaint?.longitude);
  const lat = coords?.[0];
  const lng = coords?.[1];

  // ── Fetch all complaints ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    api.get("/complaints", { params: { limit: 500 } })
      .then((res) => {
        const raw = res.data.data;
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        setAllComplaints(items.filter((c: any) => !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))));
      })
      .catch(() => {});
  }, [open]);

  // ── Reverse geocode (coordinates are ground truth) ────────────────────────
  useEffect(() => {
    if (!open || lat == null || lng == null) return;
    reverseGeocode(lat, lng).then(setGeocodeData);
  }, [open, lat, lng]);

  // ── Fetch timeline on demand ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTool !== "timeline" || !complaint?.id) return;
    setTimelineLoading(true);
    api.get(`/complaints/${complaint.id}/timeline`)
      .then((res) => {
        const raw = res.data.data;
        const items = Array.isArray(raw) ? raw : [];
        setTimelineData(items);
      })
      .catch(() => setTimelineData([]))
      .finally(() => setTimelineLoading(false));
  }, [activeTool, complaint?.id]);

  // ── Fetch media/evidence on demand ────────────────────────────────────────
  useEffect(() => {
    if (activeTool !== "evidence" || !complaint?.id) return;
    setMediaLoading(true);
    api.get(`/complaints/${complaint.id}`)
      .then((res) => {
        const raw = res.data.data;
        setMediaData(Array.isArray(raw?.media) ? raw.media : []);
      })
      .catch(() => setMediaData([]))
      .finally(() => setMediaLoading(false));
  }, [activeTool, complaint?.id]);

  // ── Animate panel in/out ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTool === "timeline" || activeTool === "evidence") {
      // Small delay so CSS transition fires
      const t = setTimeout(() => setPanelVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setPanelVisible(false);
      return undefined;
    }
  }, [activeTool]);

  // ── Initialize Leaflet ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !mapContainerRef.current || !coords) return;
    let cancelled = false;
    setMapReady(false);

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;
      const Lf = (L as any).default ?? L;

      if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; layerRefs.current = {}; }

      delete (Lf.Icon.Default.prototype as any)._getIconUrl;
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = Lf.map(mapContainerRef.current, { center: [lat!, lng!], zoom: 15, zoomControl: true, preferCanvas: true });

      const osmLayer = Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors', maxZoom: 19,
      });
      const satLayer = Lf.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles &copy; Esri", maxZoom: 19 }
      );

      osmLayer.addTo(map);
      layerRefs.current.osm = osmLayer;
      layerRefs.current.satellite = satLayer;

      // Selected complaint marker — large, prominent
      const color = PRIORITY_COLOR[complaint.priority] ?? "#ef4444";
      const markerHtml = `
        <div style="position:relative;width:34px;height:44px;">
          <div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.45);"></div>
          <div style="position:absolute;top:8px;left:8px;width:14px;height:14px;border-radius:50%;background:white;opacity:0.95;"></div>
        </div>`;

      const dept = complaint.department?.name || complaint.departmentId || "Water Supply Dept";
      const createdAt = complaint.createdAt ? format(new Date(complaint.createdAt), "dd MMM yyyy") : "—";
      const radiusM = IMPACT_RADIUS[complaint.priority] ?? 500;
      const priLabel = complaint.priority?.toUpperCase() ?? "MEDIUM";

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:210px;padding:2px 0">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#0f172a;">${complaint.complaintNumber || complaint.id}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:6px;">${complaint.category}</div>
          <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="background:${color}18;color:${color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid ${color}40;">${priLabel}</span>
            <span style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;">${complaint.status}</span>
          </div>
          <div style="border-top:1px solid #f1f5f9;padding-top:7px;display:flex;flex-direction:column;gap:3px;">
            <div style="font-size:11px;color:#64748b;"><b>Reported:</b> ${createdAt}</div>
            <div style="font-size:11px;color:#64748b;"><b>Dept:</b> ${dept}</div>
            <div style="font-size:11px;color:#64748b;"><b>Impact radius:</b> ${radiusM} m</div>
            <div style="font-size:11px;color:#64748b;"><b>Affected area:</b> ${impactArea(radiusM)} km²</div>
          </div>
        </div>`;

      const markerIcon = Lf.divIcon({ html: markerHtml, className: "", iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -46] });
      Lf.marker([lat!, lng!], { icon: markerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(Lf.popup({ maxWidth: 260 }).setContent(popupHtml))
        .openPopup();

      mapRef.current = map;
      setTimeout(() => { if (!cancelled) { map.invalidateSize(); setMapReady(true); } }, 150);
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [open]);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; layerRefs.current = {}; }
      setMapReady(false); setActiveTool("none"); setViewMode("2d"); setInfraStatus("idle"); setInfraCounts({});
    }
  }, [open]);

  // ── 2D / Satellite toggle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    if (viewMode === "satellite") {
      layerRefs.current.osm?.remove();
      if (layerRefs.current.satellite) layerRefs.current.satellite.addTo(map);
    } else {
      layerRefs.current.satellite?.remove();
      if (layerRefs.current.osm) layerRefs.current.osm.addTo(map);
    }
  }, [viewMode, mapReady]);

  // ── IMPACT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || !coords) return;
    if (layerRefs.current.impact) { try { layerRefs.current.impact.remove(); } catch (_) {} delete layerRefs.current.impact; }
    if (activeTool !== "impact") return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      const Lf = (L as any).default ?? L;
      const radius = IMPACT_RADIUS[complaint.priority] ?? 500;
      const circle = Lf.circle([lat!, lng!], {
        radius, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.08, weight: 2.5, dashArray: "10 6",
      }).addTo(mapRef.current);
      circle.bindTooltip(`Impact radius: ${radius}m — Affected area: ${impactArea(radius)} km²`, { permanent: false, sticky: true });
      layerRefs.current.impact = circle;
    });
  }, [activeTool, mapReady]);

  // ── CLUSTERS ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTool !== "clusters") {
      if (layerRefs.current.clusters) { try { mapRef.current?.removeLayer(layerRefs.current.clusters); } catch (_) {} delete layerRefs.current.clusters; }
      return;
    }
    if (!mapRef.current || !mapReady || allComplaints.length === 0) return;

    loadLink("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "lmc-css");
    loadLink("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css", "lmc-def-css");
    loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "lmc-js")
      .then(() => import("leaflet").then((L) => {
        if (!mapRef.current) return;
        const Lf = (L as any).default ?? L;
        const group = (Lf as any).markerClusterGroup({ maxClusterRadius: 60, spiderfyOnMaxZoom: true, showCoverageOnHover: false });
        allComplaints.forEach((c: any) => {
          const la = parseFloat(c.latitude), lo = parseFloat(c.longitude);
          if (!isNaN(la) && !isNaN(lo)) {
            const isSelected = c.id === complaint.id;
            const col = isSelected ? PRIORITY_COLOR[c.priority] ?? "#6b7280" : "#94a3b8";
            const size = isSelected ? 12 : 8;
            const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${col};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`;
            const icon = Lf.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
            const m = Lf.marker([la, lo], { icon });
            m.bindPopup(`<div style="font-size:12px"><b>${c.complaintNumber || c.id}</b><br/>${c.category || ""}<br/><span style="color:${col};font-weight:600">${c.priority || ""}</span></div>`);
            group.addLayer(m);
          }
        });
        group.addTo(mapRef.current);
        layerRefs.current.clusters = group;
      })).catch(console.error);
  }, [activeTool, mapReady, allComplaints]);

  // ── HEATMAP ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTool !== "heatmap") {
      if (layerRefs.current.heat) { try { mapRef.current?.removeLayer(layerRefs.current.heat); } catch (_) {} delete layerRefs.current.heat; }
      return;
    }
    if (!mapRef.current || !mapReady || allComplaints.length === 0) return;

    loadScript("https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js", "leaflet-heat-js")
      .then(() => import("leaflet").then((L) => {
        if (!mapRef.current) return;
        const Lf = (L as any).default ?? L;
        const WEIGHT: Record<string, number> = { CRITICAL: 1, HIGH: 1, High: 1, MEDIUM: 0.6, Medium: 0.6, LOW: 0.3, Low: 0.3 };
        const points = allComplaints.map((c: any) => [parseFloat(c.latitude), parseFloat(c.longitude), WEIGHT[c.priority ?? "Low"] ?? 0.4]);
        const heat = (Lf as any).heatLayer(points, { radius: 35, blur: 22, maxZoom: 18, gradient: { 0.3: "#3b82f6", 0.6: "#f97316", 1.0: "#ef4444" } });
        heat.addTo(mapRef.current);
        layerRefs.current.heat = heat;
      })).catch(console.error);
  }, [activeTool, mapReady, allComplaints]);

  // ── INFRASTRUCTURE ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTool !== "infrastructure") {
      if (layerRefs.current.infraGroup) { try { mapRef.current?.removeLayer(layerRefs.current.infraGroup); } catch (_) {} delete layerRefs.current.infraGroup; }
      setInfraStatus("idle"); setInfraCounts({});
      return;
    }
    if (!mapRef.current || !mapReady || !coords) return;

    setInfraStatus("loading"); setInfraCounts({});
    mapRef.current.setZoom(17);

    // Build a compact query that fits in a GET URL
    const q = `[out:json][timeout:30];(way["building"](around:500,${lat!},${lng!});way["highway"~"primary|secondary|tertiary|residential|service"](around:500,${lat!},${lng!});node["amenity"~"hospital|clinic|school|college|police|fire_station"](around:500,${lat!},${lng!});way["amenity"~"hospital|clinic|school|college"](around:500,${lat!},${lng!});node["man_made"~"water_tower|water_works"](around:500,${lat!},${lng!}););out geom;`;

    // Use backend proxy to avoid CORS — backend calls Overpass server-side
    api.post("/geo/overpass", { query: q })
      .then((res) => {
        const data = res.data;
        if (!mapRef.current) return;
        import("leaflet").then((L) => {
          if (!mapRef.current) return;
          const Lf = (L as any).default ?? L;

          if (layerRefs.current.infraGroup) { try { mapRef.current.removeLayer(layerRefs.current.infraGroup); } catch (_) {} }

          const countsAcc: Record<string, number> = {};
          const layerGroup = Lf.layerGroup();

          for (const el of data.elements ?? []) {
            const cat = classifyElement(el.tags);
            const catDef = INFRA_CATEGORIES.find((c) => c.key === cat) ?? INFRA_CATEGORIES[INFRA_CATEGORIES.length - 1]!;
            countsAcc[cat] = (countsAcc[cat] ?? 0) + 1;

            const lvls = estimateLevels(el.tags);
            const lvlText = lvls != null ? `${lvls} floor${lvls !== 1 ? "s" : ""}` : "";
            const namePart = el.tags?.name ? `<b>${el.tags.name}</b><br/>` : "";
            const tooltip = `${namePart}${catDef.label}${lvlText ? "<br/>" + lvlText : ""}`;

            if (el.type === "way" && el.geometry?.length >= 3) {
              const isHighway = el.tags?.["highway"];
              if (isHighway) {
                const latlngs = el.geometry.map((pt: any) => [pt.lat, pt.lon]);
                const line = Lf.polyline(latlngs, { color: catDef.color, weight: 3, opacity: 0.8 });
                line.bindTooltip(tooltip, { sticky: true, opacity: 0.92 });
                layerGroup.addLayer(line);
              } else {
                const latlngs = el.geometry.map((pt: any) => [pt.lat, pt.lon]);
                const poly = Lf.polygon(latlngs, {
                  fillColor: catDef.fillColor, fillOpacity: 0.6,
                  color: catDef.color, weight: 1.5,
                });
                poly.bindTooltip(tooltip, { sticky: true, opacity: 0.92 });
                layerGroup.addLayer(poly);
              }
            } else if (el.type === "node" && el.lat != null && el.lon != null) {
              const dot = Lf.circleMarker([el.lat, el.lon], {
                radius: 7, fillColor: catDef.fillColor, fillOpacity: 0.9,
                color: catDef.color, weight: 2,
              });
              dot.bindTooltip(tooltip, { sticky: true, opacity: 0.92 });
              layerGroup.addLayer(dot);
            }
          }

          layerGroup.addTo(mapRef.current);
          layerRefs.current.infraGroup = layerGroup;
          setInfraCounts(countsAcc);
          setInfraStatus("ready");
        });
      })
      .catch((err) => {
        console.error("Overpass error:", err);
        setInfraStatus("failed");
      });
  }, [activeTool, mapReady]);

  // ── Center on complaint ───────────────────────────────────────────────────
  const centerOnComplaint = () => {
    if (mapRef.current && coords) mapRef.current.flyTo([lat!, lng!], 15);
  };

  const toggleTool = (tool: ActiveTool) => setActiveTool((prev) => (prev === tool ? "none" : tool));
  const toggleSection = (key: string) => setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Location display — ALWAYS derived from GPS coordinates (Nominatim) ────
  const addr = geocodeData?.address ?? {};
  const displayAddress = buildAddress(geocodeData) || complaint.address || (coords ? `${lat?.toFixed(5)}, ${lng?.toFixed(5)}` : "Unavailable");
  const displayRoad = addr.road || addr.pedestrian || addr.footway || addr.path || "";
  const displayLocality = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.hamlet || "";
  const displayCity = addr.city || addr.town || addr.municipality || addr.village || "";
  const displayDistrict = addr.county || addr.city_district || addr.district || "";
  const displayState = addr.state || "";
  const displayPostcode = addr.postcode || "";
  // Complaint-reported road (from the complaint record itself)
  const reportedRoad = complaint.nearestRoad || "";
  const landmark = complaint.landmark || "";

  const priorityColor = PRIORITY_COLOR[complaint.priority] ?? "#6b7280";
  const radiusM = IMPACT_RADIUS[complaint.priority] ?? 500;

  const timelineEvents = timelineData.map((h: any) => ({
    time: h.createdAt ? format(new Date(h.createdAt), "dd MMM yyyy, hh:mm a") : "",
    label: stripEmojis(h.title || h.eventType || "Event"),
    by: h.actorName || h.performedBy || "System",
    description: h.description || h.note || "",
    status: h.newStatus || h.toStatus || "",
    prevStatus: h.previousStatus || "",
  }));

  const media: any[] = mediaData;
  const getMediaSrc = (m: any) => m?.url?.startsWith("/") ? `${SERVER_URL}${m.url}` : m?.url ?? "";

  // Infrastructure totals
  const totalInfraAssets = Object.values(infraCounts).reduce((a, b) => a + b, 0);
  const infraSubtitle = activeTool === "infrastructure" && infraStatus === "ready" && totalInfraAssets > 0
    ? `${totalInfraAssets} assets`
    : "500m radius";

  // Cluster count
  const clusterCount = allComplaints.length;
  const clusterSubtitle = clusterCount > 0 ? `${clusterCount} complaints` : "All DB complaints";

  if (!open) return null;

  const tools: { id: ActiveTool; label: string; Icon: any; color: string; desc: string }[] = [
    { id: "impact",         label: "IMPACT",         Icon: Target,    color: "#ef4444", desc: `${radiusM}m radius` },
    { id: "clusters",       label: "CLUSTERS",        Icon: Layers,    color: "#3b82f6", desc: clusterSubtitle },
    { id: "heatmap",        label: "HEATMAP",         Icon: BarChart2, color: "#f97316", desc: "Density by priority" },
    { id: "infrastructure", label: "INFRASTRUCTURE",  Icon: Building2, color: "#10b981", desc: infraSubtitle },
    { id: "timeline",       label: "TIMELINE",        Icon: Clock,     color: "#a78bfa", desc: timelineLoading ? "Loading..." : `${timelineEvents.length} events` },
    { id: "evidence",       label: "EVIDENCE",        Icon: ImageIcon, color: "#f59e0b", desc: mediaLoading ? "Loading..." : `${media.length} file${media.length !== 1 ? "s" : ""}` },
  ];

  // ── Section helper ────────────────────────────────────────────────────────
  const Section = ({ sKey, title, children }: { sKey: string; title: string; children: React.ReactNode }) => {
    const collapsed = collapsedSections[sKey];
    return (
      <section className="border-t pt-3 mb-3" style={{ borderColor: T.border }}>
        <button
          className="flex w-full items-center justify-between mb-2"
          onClick={() => toggleSection(sKey)}
          aria-expanded={!collapsed}
        >
          <span className="text-[10px] font-bold tracking-widest" style={{ color: T.sectionLabel }}>
            {title.toUpperCase()}
          </span>
          {collapsed
            ? <ChevronRight className="h-3 w-3" style={{ color: T.sectionLabel }} />
            : <ChevronDown className="h-3 w-3" style={{ color: T.sectionLabel }} />}
        </button>
        {!collapsed && children}
      </section>
    );
  };

  // ── Value row ─────────────────────────────────────────────────────────────
  const VRow = ({ label, value, mono = false, accent }: { label: string; value: string; mono?: boolean; accent?: string }) => (
    <div className="flex flex-col gap-0.5 mb-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: T.sectionLabel }}>{label}</span>
      <span className={`text-xs leading-snug${mono ? " font-mono" : ""}`} style={{ color: accent ?? T.text }}>{value || "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: T.appBg }} role="dialog" aria-modal="true">

      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4" style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Janseva AI emblem" className="h-9 w-9 xl:h-11 xl:w-11" style={{ filter: isDark ? "invert(1)" : "none" }} />
          <div className="flex flex-col justify-center">
            <span className="font-display text-base font-bold tracking-wide" style={{ color: T.text }}>
              JANSEVA AI
            </span>
            <span className="text-[10px]" style={{ color: T.textMuted }}>
              Your Voice. Our Action.
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* 2D / Satellite */}
          <div className="flex overflow-hidden rounded-lg" style={{ border: `1px solid ${T.border}` }}>
            {(["2d", "satellite"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: viewMode === mode ? "#2563eb" : "transparent", color: viewMode === mode ? "white" : T.textMuted }}
                aria-pressed={viewMode === mode}
              >
                {mode === "2d" ? <Globe className="h-3 w-3" /> : <Satellite className="h-3 w-3" />}
                {mode === "2d" ? "2D MAP" : "SATELLITE"}
              </button>
            ))}
          </div>

          {/* Center on Complaint */}
          <button
            onClick={centerOnComplaint}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ border: `1px solid ${T.border}`, color: T.text, background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Crosshair className="h-3.5 w-3.5" /> Center on Complaint
          </button>

          {/* Light / Dark toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
            style={{ border: `1px solid ${T.border}`, color: T.text, background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ border: `1px solid ${T.border}`, color: T.textMuted, background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Close viewer"
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div
          className="flex shrink-0 flex-col overflow-y-auto"
          style={{ width: 270, background: T.sidebarBg, borderRight: `1px solid ${T.border}` }}
        >
          {/* Complaint badge */}
          <div className="px-4 pt-4 pb-2">
            <div className="rounded-xl p-3" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold" style={{ color: T.text }}>{complaint.complaintNumber || complaint.id}</div>
                  <div className="text-[11px] font-semibold mt-0.5" style={{ color: T.textMuted }}>{complaint.category}</div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: priorityColor + "18", color: priorityColor, border: `1px solid ${priorityColor}40` }}>
                  {complaint.priority?.toUpperCase()}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t" style={{ borderColor: T.border }}>
                <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.textMuted }}>
                  {complaint.status}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 flex-1">
            {/* Coordinates */}
            <div className="mb-3 rounded-lg p-2.5" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
              <div className="text-[9px] font-bold tracking-widest mb-1" style={{ color: T.sectionLabel }}>GPS COORDINATES</div>
              {coords ? (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: T.textFaint }}>Lat</span>
                    <span className="font-mono font-semibold" style={{ color: T.text }}>{lat!.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: T.textFaint }}>Lng</span>
                    <span className="font-mono font-semibold" style={{ color: T.text }}>{lng!.toFixed(6)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "#ef4444" }}>Coordinates unavailable</div>
              )}
            </div>

            {/* Address */}
            <Section sKey="address" title="Address">
              <div className="text-xs leading-relaxed" style={{ color: T.textMuted }}>
                {geocodeData ? displayAddress : "Fetching from coordinates..."}
              </div>
              {displayLocality && (
                <div className="mt-1 text-[11px]" style={{ color: T.textFaint }}>Locality: {displayLocality}</div>
              )}
            </Section>

            {/* Spatial Context */}
            <Section sKey="spatial" title="Spatial Context">
              <div className="space-y-0">
                {displayRoad && <VRow label="Nearest Road (GPS-derived)" value={displayRoad} />}
                {reportedRoad && reportedRoad !== displayRoad && <VRow label="Complaint-reported Road" value={reportedRoad} />}
                {landmark && <VRow label="Landmark" value={landmark} />}
                {displayCity && <VRow label="City" value={displayCity} />}
                {displayDistrict && <VRow label="District" value={displayDistrict} />}
                {displayState && <VRow label="State" value={displayState} />}
                {displayPostcode && <VRow label="PIN Code" value={displayPostcode} mono />}
                {!geocodeData && <div className="text-[11px]" style={{ color: T.textFaint }}>Loading from GPS coordinates...</div>}
              </div>
            </Section>

            {/* Impact Analysis */}
            <Section sKey="impact" title="Impact Analysis">
              <div className="rounded-lg p-2.5 mb-2" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color: T.textFaint }}>Severity</span>
                  <span className="text-[11px] font-bold" style={{ color: priorityColor }}>{complaint.priority?.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color: T.textFaint }}>Impact Radius</span>
                  <span className="text-[11px] font-semibold" style={{ color: T.text }}>{radiusM} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: T.textFaint }}>Affected Area</span>
                  <span className="text-[11px] font-semibold" style={{ color: T.text }}>{impactArea(radiusM)} km²</span>
                </div>
              </div>
              {activeTool !== "impact" && (
                <div className="text-[10px]" style={{ color: T.textFaint }}>Activate IMPACT mode to visualise on map.</div>
              )}
            </Section>

            {/* Infrastructure breakdown */}
            <Section sKey="infra" title="Infrastructure">
              {activeTool === "infrastructure" ? (
                infraStatus === "loading" ? (
                  <div className="text-xs" style={{ color: T.textFaint }}>Fetching infrastructure data...</div>
                ) : infraStatus === "failed" ? (
                  <div className="text-xs" style={{ color: "#f97316" }}>Could not reach OpenStreetMap API.</div>
                ) : (
                  <div>
                    {totalInfraAssets === 0 ? (
                      <div className="text-xs" style={{ color: T.textFaint }}>No mapped infrastructure in this area.</div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold mb-2" style={{ color: T.text }}>{totalInfraAssets} assets within 500m</div>
                        {INFRA_CATEGORIES.map((cat) => {
                          const cnt = infraCounts[cat.key] ?? 0;
                          if (cnt === 0) return null;
                          return (
                            <div key={cat.key} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: cat.fillColor, border: `1px solid ${cat.color}` }} />
                                <span className="text-[11px]" style={{ color: T.textMuted }}>{cat.label}</span>
                              </div>
                              <span className="text-[11px] font-semibold" style={{ color: T.text }}>{cnt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-xs" style={{ color: T.textFaint }}>Activate INFRASTRUCTURE mode to view civic assets.</div>
              )}
            </Section>

            {/* Related data */}
            <Section sKey="related" title="Related Data">
              <VRow label="Total DB Complaints" value={allComplaints.length > 0 ? `${allComplaints.length} with GPS` : "Loading..."} />
              {activeTool === "clusters" && <div className="text-[11px]" style={{ color: "#3b82f6" }}>Clustering active — coloured by priority.</div>}
              {activeTool === "heatmap" && <div className="text-[11px]" style={{ color: "#f97316" }}>Heatmap active — weighted by priority.</div>}
            </Section>

            {/* Data freshness footer */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: T.border }}>
              <div className="text-[9px] space-y-1" style={{ color: T.textFaint }}>
                <div><span style={{ color: T.sectionLabel }}>Source:</span> JanSeva Complaint Database</div>
                <div><span style={{ color: T.sectionLabel }}>Map:</span> OpenStreetMap contributors</div>
                <div><span style={{ color: T.sectionLabel }}>Loaded:</span> {format(dataFetchedAt, "dd MMM yyyy, hh:mm a")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Map Area ── */}
        <div className="relative min-w-0 flex-1">
          {!coords ? (
            <div className="flex h-full items-center justify-center" style={{ background: T.appBg }}>
              <div className="text-center">
                <div className="text-lg font-semibold mb-1" style={{ color: T.text }}>Location unavailable</div>
                <div className="text-sm" style={{ color: T.textMuted }}>Complaint coordinates are missing or invalid.</div>
              </div>
            </div>
          ) : (
            <>
              {/* Loading state */}
              {!mapReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: T.appBg }}>
                  <div className="text-sm" style={{ color: T.textMuted }}>Loading map...</div>
                </div>
              )}

              {/* Map notices */}
              {activeTool === "infrastructure" && infraStatus === "loading" && (
                <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-xs shadow-lg" style={{ background: T.popupBg, color: T.noticeText, border: `1px solid ${T.border}` }}>
                  Fetching infrastructure from OpenStreetMap...
                </div>
              )}
              {activeTool === "infrastructure" && infraStatus === "failed" && (
                <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-xs shadow-lg" style={{ background: T.popupBg, color: "#f97316", border: `1px solid ${T.border}` }}>
                  Infrastructure data unavailable — check internet connection.
                </div>
              )}

              {/* Infrastructure legend */}
              {activeTool === "infrastructure" && infraStatus === "ready" && totalInfraAssets > 0 && (
                <div className="absolute bottom-16 right-4 z-20 rounded-xl p-3 text-[10px] shadow-lg" style={{ background: T.popupBg, border: `1px solid ${T.border}`, color: T.textMuted, minWidth: 160 }}>
                  <div className="font-bold mb-2 text-[11px]" style={{ color: T.text }}>INFRASTRUCTURE</div>
                  {INFRA_CATEGORIES.map((cat) => {
                    const cnt = infraCounts[cat.key] ?? 0;
                    if (cnt === 0) return null;
                    return (
                      <div key={cat.key} className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: cat.fillColor, border: `1px solid ${cat.color}` }} />
                          <span>{cat.label}</span>
                        </div>
                        <span className="font-semibold" style={{ color: T.text }}>{cnt}</span>
                      </div>
                    );
                  })}
                  <div className="mt-2 pt-2 border-t font-semibold" style={{ borderColor: T.border, color: T.text }}>
                    Total: {totalInfraAssets}
                  </div>
                </div>
              )}

              {/* Cluster / Heatmap legend */}
              {(activeTool === "clusters" || activeTool === "heatmap") && (
                <div className="absolute bottom-16 right-4 z-20 rounded-xl p-3 text-[10px] shadow-lg" style={{ background: T.popupBg, border: `1px solid ${T.border}`, color: T.textMuted, minWidth: 140 }}>
                  <div className="font-bold mb-2" style={{ color: T.text }}>LEGEND</div>
                  {activeTool === "clusters" && [["High / Critical", "#ef4444"], ["Medium", "#f97316"], ["Low", "#94a3b8"], ["Selected", PRIORITY_COLOR[complaint.priority] ?? "#ef4444"]].map(([lbl, col]) => (
                    <div key={lbl} className="flex items-center gap-2 mb-1">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                      <span>{lbl}</span>
                    </div>
                  ))}
                  {activeTool === "heatmap" && [["High density", "#ef4444"], ["Medium", "#f97316"], ["Low density", "#3b82f6"]].map(([lbl, col]) => (
                    <div key={lbl} className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-4 rounded" style={{ background: col }} />
                      <span>{lbl}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Leaflet map */}
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />

              {/* Leaflet map fills entire area */}
            </>
          )}
        </div>

        {/* ── Timeline / Evidence Side Panel ── overlay the full body area */}
        {(activeTool === "timeline" || activeTool === "evidence") && (
          <div
            className="absolute bottom-0 right-0 top-0 z-30 flex flex-col shadow-2xl"
            style={{
              width: "clamp(320px, 35vw, 460px)",
              background: T.sidebarBg,
              borderLeft: `1px solid ${T.border}`,
              transform: panelVisible ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Panel header */}
            <div
              className="flex h-14 shrink-0 items-center justify-between px-5"
              style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}` }}
            >
              <div className="flex items-center gap-3">
                {activeTool === "timeline" ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#a78bfa22", border: "1px solid #a78bfa44" }}>
                    <Clock className="h-4 w-4" style={{ color: "#a78bfa" }} />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#f59e0b22", border: "1px solid #f59e0b44" }}>
                    <ImageIcon className="h-4 w-4" style={{ color: "#f59e0b" }} />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold" style={{ color: T.text }}>
                    {activeTool === "timeline" ? "Complaint Timeline" : "Evidence Photos"}
                  </div>
                  <div className="text-[10px]" style={{ color: T.textMuted }}>
                    {activeTool === "timeline"
                      ? (timelineLoading ? "Loading events..." : `${timelineEvents.length} events recorded`)
                      : (mediaLoading ? "Loading photos..." : `${media.length} file${media.length !== 1 ? "s" : ""} uploaded`)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTool("none")}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: T.textMuted, border: `1px solid ${T.border}` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>

              {/* ─── TIMELINE ─── */}
              {activeTool === "timeline" && (
                <div className="p-5">
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-sm" style={{ color: T.textMuted }}>Loading timeline...</div>
                    </div>
                  ) : timelineEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Clock className="h-10 w-10 opacity-20" style={{ color: T.text }} />
                      <div className="text-sm" style={{ color: T.textFaint }}>No timeline events found.</div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical line */}
                      <div
                        className="absolute left-[19px] top-4 bottom-4"
                        style={{ width: 2, background: `linear-gradient(to bottom, #a78bfa, #3b82f6, ${T.border})` }}
                      />
                      <div className="space-y-0">
                        {timelineEvents.map((t: any, i: number) => (
                          <div key={i} className="relative flex gap-4 pb-7 last:pb-0">
                            {/* Dot */}
                            <div
                              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                              style={{
                                background: i === 0 ? "#a78bfa" : T.cardBg,
                                border: `2px solid ${i === 0 ? "#a78bfa" : "#3b82f6"}`,
                                boxShadow: i === 0 ? "0 0 0 4px #a78bfa22" : undefined,
                              }}
                            >
                              <Clock className="h-4 w-4" style={{ color: i === 0 ? "white" : "#3b82f6" }} />
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="text-[10px] font-semibold tracking-wide mb-1" style={{ color: "#a78bfa" }}>{t.time}</div>
                              <div className="text-sm font-bold leading-snug mb-1.5" style={{ color: T.text }}>{t.label || "Event"}</div>
                              {t.description && (
                                <div className="text-xs mb-2 leading-relaxed whitespace-pre-wrap" style={{ color: T.textMuted }}>{t.description}</div>
                              )}
                              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
                                <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#3b82f6" }} />
                                <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>{t.by}</span>
                              </div>
                              {t.status && (
                                <span className="ml-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "#3b82f622", color: "#3b82f6", border: "1px solid #3b82f640" }}>
                                  {t.prevStatus ? `${t.prevStatus.replace(/_/g, " ")} → ` : ""}{t.status.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── EVIDENCE ─── */}
              {activeTool === "evidence" && (
                <div className="p-5">
                  {mediaLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-sm" style={{ color: T.textMuted }}>Loading evidence photos...</div>
                    </div>
                  ) : media.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <ImageIcon className="h-10 w-10 opacity-20" style={{ color: T.text }} />
                      <div className="text-sm" style={{ color: T.textFaint }}>No evidence photos uploaded by citizen.</div>
                      <div className="text-xs" style={{ color: T.textFaint }}>Photos are uploaded when a complaint is filed.</div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: T.sectionLabel }}>COMPLAINT EVIDENCE — {media.length} FILE{media.length !== 1 ? "S" : ""}</div>
                      {media.map((m: any, i: number) => {
                        const src = getMediaSrc(m);
                        return (
                          <div
                            key={m.id || i}
                            className="overflow-hidden rounded-2xl shadow-md"
                            style={{ border: `1px solid ${T.border}`, background: T.cardBg }}
                          >
                            {/* Card header */}
                            <div
                              className="flex items-center justify-between px-4 py-2.5"
                              style={{ borderBottom: `1px solid ${T.border}` }}
                            >
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} />
                                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: T.sectionLabel }}>
                                  {m.role ? m.role.replace(/_/g, " ") : `Photo ${i + 1}`}
                                </span>
                              </div>
                              <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold rounded-full px-2.5 py-0.5 transition-colors"
                                style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}
                              >
                                Open
                              </a>
                            </div>
                            {/* Image */}
                            <div className="relative bg-black/10" style={{ aspectRatio: "16/9" }}>
                              <img
                                src={src}
                                alt={m.originalName || `Evidence ${i + 1}`}
                                crossOrigin="anonymous"
                                className="h-full w-full object-cover"
                                style={{ display: "block" }}
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  el.style.display = "none";
                                  const fb = document.createElement("div");
                                  fb.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;font-size:11px;color:#94a3b8;";
                                  fb.innerText = `Could not load: ${m.originalName || m.filename || "file"}`;
                                  el.parentElement?.appendChild(fb);
                                }}
                              />
                            </div>
                            {/* Footer */}
                            {(m.originalName || m.mimeType) && (
                              <div className="px-4 py-2" style={{ borderTop: `1px solid ${T.border}` }}>
                                <div className="text-[10px] truncate" style={{ color: T.textFaint }}>
                                  {m.originalName || m.filename} {m.mimeType ? `· ${m.mimeType}` : ""}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Toolbar ── */}
      <div className="shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.toolbarBg }}>
        <div className="flex gap-1 overflow-x-auto px-3 py-1.5">
          {tools.map(({ id, label, Icon, color, desc }) => {
            const isActive = activeTool === id;
            return (
              <button
                key={id}
                onClick={() => toggleTool(id)}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all"
                style={{
                  border: isActive ? `1.5px solid ${color}` : `1px solid ${T.btnBorder}`,
                  background: isActive ? `${color}15` : "transparent",
                  color: isActive ? color : T.textMuted,
                  minWidth: 76,
                }}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5 mb-0.5" />
                <span className="leading-tight">{label}</span>
                <span className="text-[8px] opacity-60 leading-tight">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
