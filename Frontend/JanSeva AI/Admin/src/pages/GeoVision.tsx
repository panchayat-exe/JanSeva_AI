import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Radio,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type GeoComplaint = {
  id: string;
  complaintNumber: string;
  category: string;        // human-readable, e.g. "Roads & Infrastructure"
  rawCategory: string;     // ROADS_INFRASTRUCTURE
  city: string;
  state: string;
  priority: string;        // raw: HIGH, MEDIUM, LOW, CRITICAL
  status: string;          // raw: SUBMITTED, IN_PROGRESS, etc.
  lat: number;
  lng: number;
  description?: string;
  address?: string;
  createdAt: string;
};

type Hotspot = {
  category: string;
  city: string;
  state: string;
  count: number;
  severity: "High" | "Medium" | "Low";
};

// ─── Category display labels ──────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  WATER_SUPPLY: "Water Supply",
  ELECTRICITY: "Electricity",
  GARBAGE_SANITATION: "Garbage & Sanitation",
  ROADS_INFRASTRUCTURE: "Roads & Infrastructure",
  DRAINAGE_SEWAGE: "Drainage & Sewage",
  STREET_LIGHTS: "Street Lights",
  PARKS_RECREATION: "Parks & Recreation",
  BUILDING_PERMITS: "Building Permits",
  NOISE_POLLUTION: "Noise Pollution",
  AIR_POLLUTION: "Air Pollution",
  PUBLIC_TRANSPORT: "Public Transport",
  LAW_AND_ORDER: "Law & Order",
  HEALTH_SERVICES: "Health Services",
  EDUCATION: "Education",
  OTHER: "Other",
};

function formatCategory(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

// ─── Priority / status normalisation ─────────────────────────────────────────
type Priority = "High" | "Medium" | "Low";
type Status = "Pending" | "Assigned" | "In Progress" | "Resolved";

const PRIORITY_MAP: Record<string, Priority> = {
  CRITICAL: "High", HIGH: "High", MEDIUM: "Medium", LOW: "Low", NORMAL: "Low",
};

const STATUS_MAP: Record<string, Status> = {
  SUBMITTED: "Pending", UNDER_REVIEW: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", REOPENED: "In Progress",
  RESOLVED: "Resolved", CLOSED: "Resolved", REJECTED: "Resolved",
};

const STATUS_ACTIVE: Status[] = ["Pending", "Assigned", "In Progress"];

const PRIORITY_COLORS: Record<string, string> = {
  High: "#ef4444", Medium: "#f97316", Low: "#6b7280",
};

const PRIORITY_BG: Record<string, string> = {
  High: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800/40 dark:text-red-400",
  Medium: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800/40 dark:text-orange-400",
  Low: "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-400",
};

// ─── City → Coordinates (for when lat/lng not in DB) ─────────────────────────
// This is the ONLY fallback; we never invent new complaint records.
const CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [19.0760, 72.8777],
  pune: [18.5204, 73.8567],
  nagpur: [21.1458, 79.0882],
  nashik: [19.9975, 73.7898],
  aurangabad: [19.8762, 75.3433],
  delhi: [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.3850, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  vadodara: [22.3072, 73.1812],
  rajkot: [22.3039, 70.8022],
  jaipur: [26.9124, 75.7873],
  jodhpur: [26.2389, 73.0243],
  lucknow: [26.8467, 80.9462],
  kanpur: [26.4499, 80.3319],
  agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739],
  bhopal: [23.2599, 77.4126],
  indore: [22.7196, 75.8577],
  patna: [25.5941, 85.1376],
  bhubaneswar: [20.2961, 85.8245],
  guwahati: [26.1445, 91.7362],
  chandigarh: [30.7333, 76.7794],
  ludhiana: [30.9010, 75.8573],
  amritsar: [31.6340, 74.8723],
  dehradun: [30.3165, 78.0322],
  shimla: [31.1048, 77.1734],
  ranchi: [23.3441, 85.3096],
  raipur: [21.2514, 81.6296],
  thiruvananthapuram: [8.5241, 76.9366],
  kochi: [9.9312, 76.2673],
  visakhapatnam: [17.6868, 83.2185],
  srinagar: [34.0837, 74.7973],
  jammu: [32.7266, 74.8570],
  coimbatore: [11.0168, 76.9558],
  madurai: [9.9252, 78.1198],
  meerut: [28.9845, 77.7064],
  gaya: [24.7914, 84.9994],
  cuttack: [20.4625, 85.8830],
  kozhikode: [11.2588, 75.7804],
  vijayawada: [16.5062, 80.6480],
  mysuru: [12.2958, 76.6394],
  udaipur: [24.5854, 73.7125],
};

function cityToCoords(city: string | null | undefined): [number, number] | null {
  if (!city) return null;
  return CITY_COORDS[city.toLowerCase()] ?? null;
}

// ─── City → State ─────────────────────────────────────────────────────────────
const CITY_STATE: Record<string, string> = {
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra",
  "new delhi": "Delhi", delhi: "Delhi",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka",
  hyderabad: "Telangana",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu",
  kolkata: "West Bengal",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat", rajkot: "Gujarat",
  jaipur: "Rajasthan", jodhpur: "Rajasthan", udaipur: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", agra: "Uttar Pradesh",
  varanasi: "Uttar Pradesh", meerut: "Uttar Pradesh",
  bhopal: "Madhya Pradesh", indore: "Madhya Pradesh",
  patna: "Bihar", gaya: "Bihar",
  bhubaneswar: "Odisha", cuttack: "Odisha",
  guwahati: "Assam",
  chandigarh: "Chandigarh",
  ludhiana: "Punjab", amritsar: "Punjab",
  dehradun: "Uttarakhand",
  shimla: "Himachal Pradesh",
  ranchi: "Jharkhand",
  raipur: "Chhattisgarh",
  thiruvananthapuram: "Kerala", kochi: "Kerala", kozhikode: "Kerala",
  visakhapatnam: "Andhra Pradesh", vijayawada: "Andhra Pradesh",
  srinagar: "Jammu & Kashmir", jammu: "Jammu & Kashmir",
  aurangabad: "Maharashtra",
};

function resolveState(city: string | null | undefined, state: string | null | undefined): string {
  if (state) return state;
  return CITY_STATE[city?.toLowerCase() ?? ""] ?? "";
}

// ─── Map marker SVG ───────────────────────────────────────────────────────────
function createMarkerSvg(color: string, selected: boolean, isHotspot = false): string {
  const size = selected ? 32 : 24;
  const ring = selected
    ? `<circle cx="16" cy="16" r="15" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>`
    : "";
  const hotspotRing = isHotspot
    ? `<circle cx="16" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5" stroke-dasharray="3 2"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="${size}" height="${Math.round(size * 1.25)}">
    ${ring}${hotspotRing}
    <path d="M16 2C10.477 2 6 6.477 6 12c0 7 10 22 10 22s10-15 10-22c0-5.523-4.477-10-10-10z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="16" cy="12" r="4" fill="white" opacity="0.9"/>
  </svg>`;
}

// ─── Hotspot detection ────────────────────────────────────────────────────────
function detectHotspots(pins: GeoComplaint[]): Hotspot[] {
  const active = pins.filter((p) => STATUS_ACTIVE.includes(STATUS_MAP[p.status] ?? "Pending"));
  const groups: Record<string, GeoComplaint[]> = {};
  for (const p of active) {
    const key = `${p.rawCategory}__${p.city}__${p.state}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([key, items]) => {
      const [rawCat, city, state] = key.split("__");
      const hasHigh = items.some((i) => (PRIORITY_MAP[i.priority] ?? "Low") === "High");
      const hasMedium = items.some((i) => (PRIORITY_MAP[i.priority] ?? "Low") === "Medium");
      return {
        category: formatCategory(rawCat ?? "OTHER"),
        city: city ?? "Unknown",
        state: state ?? "",
        count: items.length,
        severity: (hasHigh ? "High" : hasMedium ? "Medium" : "Low") as Hotspot["severity"],
      };
    });
}

// ─── Severity badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "High"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40"
      : severity === "Medium"
      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40"
      : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700";
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {severity}
    </span>
  );
}

// ─── GeoVision Component ──────────────────────────────────────────────────────
export function GeoVision(props: { isOverlay?: boolean, initialFocus?: string } = {}) {
  const { isOverlay = false, initialFocus } = props;
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const leafletRef = useRef<any>(null);

  // Role-based auth — determines which complaints are fetched
  const { user, role, isOfficer, isDeptAdmin } = (typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem("janseva_user");
          const u = raw ? JSON.parse(raw) : null;
          return {
            user: u,
            role: u?.role ?? null,
            isOfficer: u?.role === "OFFICER",
            isDeptAdmin: u?.role === "DEPT_ADMIN",
          };
        } catch { return { user: null, role: null, isOfficer: false, isDeptAdmin: false }; }
      })()
    : { user: null, role: null, isOfficer: false, isDeptAdmin: false });

  const [pins, setPins] = useState<GeoComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [noGeoCount, setNoGeoCount] = useState(0); // API complaints that had no coords
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [filterTime, setFilterTime] = useState("all");

  // Read ?focus= param safely
  const focusId = initialFocus ?? (() => {
    try {
      if (typeof window !== "undefined") {
        return new URLSearchParams(window.location.search).get("focus") ?? undefined;
      }
    } catch { return undefined; }
    return undefined;
  })();

  // ── Load REAL complaints from API ─────────────────────────────────────────
  // GeoVision is a VIEW of the complaint database — it never maintains its own records.
  // Role-based filtering: Backend automatically handles department/officer visibility.
  useEffect(() => {
    const params: Record<string, any> = { limit: 500, sortBy: "createdAt", sortOrder: "desc" };
    // We let the backend apply the default department/unassigned rules for Officers/Admins
    
    // SUPER_ADMIN: no filter — all complaints

    api
      .get<any>("/complaints", { params })
      .then(({ data }: any) => {
        const raw = data?.data;
        const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];

        console.log("[GeoVision] API returned", list.length, "complaints");

        let skipped = 0;
        const mapped: GeoComplaint[] = list
          .map((c: any) => {
            // 1. Try lat/lng from DB first
            let lat = parseFloat(c.latitude ?? c.lat ?? "");
            let lng = parseFloat(c.longitude ?? c.lng ?? "");
            let cityForLookup = c.city;

            if (isNaN(lat) || isNaN(lng)) {
              // 2. Try city name lookup
              // 3. If city is null, try to extract city from address string
              if (!cityForLookup && c.address) {
                // address may be "123 Main Street, Pune, Maharashtra" - try last 2 comma parts
                const parts = c.address.split(",").map((s: string) => s.trim());
                if (parts.length >= 2) cityForLookup = parts[parts.length - 2];
              }
              const derived = cityToCoords(cityForLookup);
              if (!derived) {
                console.log("[GeoVision] Skipping complaint (no coords, city:", c.city, ", address:", c.address, ")");
                skipped++;
                return null;
              }
              // Small jitter so markers don't stack exactly on same city coords
              lat = derived[0] + (Math.random() - 0.5) * 0.04;
              lng = derived[1] + (Math.random() - 0.5) * 0.04;
            }
            const resolvedState = resolveState(c.city ?? cityForLookup, c.state);
            return {
              id: c.id,
              complaintNumber: c.complaintNumber ?? c.id,
              category: formatCategory(c.category ?? "OTHER"),
              rawCategory: c.category ?? "OTHER",
              city: c.city ?? cityForLookup ?? "Unknown",
              state: resolvedState,
              priority: c.priority ?? "LOW",
              status: c.status ?? "SUBMITTED",
              description: c.description,
              address: c.address,
              createdAt: c.createdAt,
              lat,
              lng,
            } satisfies GeoComplaint;
          })
          .filter(Boolean) as GeoComplaint[];

        setNoGeoCount(skipped);
        setPins(mapped);

        // If navigated from ComplaintDetails with ?focus=<id>, select that complaint
        if (focusId) {
          const focusedPin = mapped.find((p) => p.id === focusId || p.complaintNumber === focusId);
          if (focusedPin) {
            setSelectedId(focusedPin.id);
            setFilterStatus("All"); // Show all statuses so the focused complaint is always visible
          }
        }
      })
      .catch((err) => {
        console.error("[GeoVision] API error:", err);
        // No fake data — show empty map with a note
        setPins([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived / filtered ────────────────────────────────────────────────────
  const filteredPins = pins.filter((p) => {
    const priority = PRIORITY_MAP[p.priority] ?? "Low";
    const status = STATUS_MAP[p.status] ?? "Pending";
    if (filterSeverity !== "All" && priority !== filterSeverity) return false;
    if (filterStatus === "Active" && !STATUS_ACTIVE.includes(status)) return false;
    if (filterStatus === "Resolved" && status !== "Resolved") return false;
    return true;
  });

  const activePins = filteredPins.filter((p) =>
    STATUS_ACTIVE.includes(STATUS_MAP[p.status] ?? "Pending")
  );
  const criticalCount = pins.filter((p) => (PRIORITY_MAP[p.priority] ?? "Low") === "High").length;
  const resolvedCount = pins.filter((p) => STATUS_MAP[p.status] === "Resolved").length;

  // ── Init Leaflet map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapReady) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      leafletRef.current = L.default ?? L;
      const Lf = leafletRef.current;

      delete (Lf.Icon.Default.prototype as any)._getIconUrl;
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = Lf.map(mapDivRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
        attributionControl: true,
        minZoom: 4,
        maxZoom: 18,
      });

      map.attributionControl.setPosition("bottomright");

      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      Lf.control.zoom({ position: "topright" }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const Lf = leafletRef.current;

    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    if (filteredPins.length === 0) return;

    const bounds: [number, number][] = [];
    const hotspotKeys = new Set(hotspots.map((h) => `${h.city}__${h.category}`));

    filteredPins.forEach((pin) => {
      const priority = PRIORITY_MAP[pin.priority] ?? "Low";
      const isSelected = pin.id === selectedId;
      const isHotspot = hotspotKeys.has(`${pin.city}__${pin.category}`);
      const color = PRIORITY_COLORS[priority] ?? "#6b7280";
      const svgStr = createMarkerSvg(color, isSelected, isHotspot);
      const iconSize: [number, number] = isSelected ? [32, 40] : [24, 30];

      const icon = Lf.divIcon({
        html: svgStr,
        className: "",
        iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]],
        popupAnchor: [0, -iconSize[1]],
      });

      const complaintUrl = `/complaints/${pin.id}`;

      const marker = Lf.marker([pin.lat, pin.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:210px;padding:2px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${pin.category}</div>
            <div style="font-size:12px;color:#555;margin-bottom:2px;display:flex;align-items:center;gap:4px">
              <span>📍</span> ${pin.city}${pin.state ? `, ${pin.state}` : ""}
            </div>
            <div style="font-size:11px;color:#888;font-family:monospace;margin-bottom:6px">${pin.complaintNumber}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
              <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${color}20;color:${color};border:1px solid ${color}40">${priority} Priority</span>
              ${isHotspot ? `<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#f59e0b20;color:#d97706;border:1px solid #f59e0b40">AI Hotspot</span>` : ""}
            </div>
            <a href="${complaintUrl}" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#1d4ed8;text-decoration:none;border:1px solid #1d4ed830;background:#1d4ed808;border-radius:6px;padding:4px 8px;">
              View Complaint →
            </a>
          </div>`
        );

      marker.on("click", () => setSelectedId(pin.id));
      markersRef.current[pin.id] = marker;
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length > 0 && !selectedId) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [filteredPins, mapReady, hotspots]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly to selected ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current[selectedId];
    const pin = filteredPins.find((p) => p.id === selectedId);
    if (!marker || !pin) return;
    mapRef.current.flyTo([pin.lat, pin.lng], 14, { animate: true, duration: 0.8 });
    marker.openPopup();
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hotspot analysis ──────────────────────────────────────────────────────
  const runHotspotAnalysis = useCallback(() => {
    setAnalyzing(true);
    setAnalyzed(false);
    setTimeout(() => {
      setHotspots(detectHotspots(pins));
      setAnalyzing(false);
      setAnalyzed(true);
    }, 1400);
  }, [pins]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Active", value: activePins.length, icon: Activity, color: "text-ashoka", bg: "bg-ashoka/10" },
    { label: "Critical", value: criticalCount, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    {
      label: "Hotspots", value: analyzed ? hotspots.length : null,
      sublabel: "Not analyzed", icon: Zap, color: "text-saffron", bg: "bg-saffron/10",
    },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-india-green", bg: "bg-india-green/10" },
  ];

  const content = (
    <div className={isOverlay ? "h-[85vh] overflow-y-auto bg-background p-4" : ""}>
      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        {stats.map(({ label, value, sublabel, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.6} />
            </span>
            <div>
              {value !== null && value !== undefined ? (
                <p className={`font-display text-xl font-semibold leading-none ${color}`}>{value}</p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground leading-tight">{sublabel ?? "0"}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Geographic Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Spatial view of the complaint database · {pins.length} complaint{pins.length !== 1 ? "s" : ""} mapped
            {noGeoCount > 0 && (
              <span className="ml-2 text-muted-foreground/60">({noGeoCount} skipped — unknown city)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="flex items-center gap-1.5 rounded-full border border-india-green/40 bg-india-green/10 px-3 py-1 text-xs font-medium text-india-green">
            <Radio className="h-3 w-3 animate-pulse" /> LIVE
          </span>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground mr-1">Filters:</span>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="h-7 cursor-pointer rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-ashoka focus:outline-none"
        >
          <option value="All">All Severity</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-7 cursor-pointer rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-ashoka focus:outline-none"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
          className="h-7 cursor-pointer rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-ashoka focus:outline-none"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>

        {(filterSeverity !== "All" || filterStatus !== "Active") && (
          <button
            onClick={() => { setFilterSeverity("All"); setFilterStatus("Active"); }}
            className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filteredPins.length} grievance{filteredPins.length !== 1 ? "s" : ""} shown
        </div>
      </div>

      {/* ── Map + Intelligence Panel (fixed height — no nested scrolling) ───── */}
      <div
        className={`flex gap-4 ${fullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}`}
        style={{ height: fullscreen ? "100%" : "clamp(480px, calc(100vh - 340px), 680px)" }}
      >
        {/* Map (65%) */}
        <div
          className="relative rounded-xl border border-border overflow-hidden bg-secondary flex-[65]"
          style={{ minWidth: 0 }}
        >
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <div ref={mapDivRef} style={{ height: "100%", width: "100%" }} />

          {/* Fullscreen */}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="absolute right-3 top-3 z-[1000] flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 shadow-sm text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
            title={fullscreen ? "Exit fullscreen" : "Expand map"}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* SPATIAL INTELLIGENCE badge — top-left */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-semibold tracking-wide text-background backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-india-green animate-pulse" />
            SPATIAL INTELLIGENCE · LIVE
          </div>

          {/* Legend — bottom-left (above attribution) */}
          <div className="absolute bottom-8 left-3 z-[1000] rounded-xl border border-border bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-lg text-[11px]">
            <p className="font-semibold text-foreground mb-1.5 uppercase tracking-wide text-[10px]">Legend</p>
            <div className="space-y-1">
              {[["bg-red-500", "Critical / High"], ["bg-orange-500", "Medium"], ["bg-gray-400", "Low"]].map(([bg, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${bg} shrink-0`} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border">
                <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-dashed border-amber-500" />
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                </span>
                <span className="text-muted-foreground">AI Hotspot</span>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-ashoka" />
                <span className="text-sm text-muted-foreground">Loading complaints from database…</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && pins.length === 0 && (
            <div className="absolute inset-0 z-[999] flex items-center justify-center">
              <div className="text-center px-6">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground mb-3" strokeWidth={1.2} />
                <p className="font-semibold text-foreground">No complaints with location data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complaints submitted via JanSeva will appear here once location data is available.
                </p>
                <Link
                  to="/complaints"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ashoka/40 bg-ashoka/5 px-4 py-2 text-sm font-medium text-ashoka hover:bg-ashoka/10 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> View Complaints
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Panel (35%) */}
        <div className="hidden flex-[35] flex-col gap-3 min-w-0 lg:flex" style={{ minWidth: 260, maxWidth: 360 }}>

          {/* Active Grievances — scrolls internally */}
          <div className="flex flex-col min-h-0 flex-1 rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold">Active Grievances</h3>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  {activePins.length} active
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Click a row to focus · Click ID to open complaint</p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading from database…</span>
                </div>
              ) : activePins.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-india-green mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">No active grievances</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {activePins.map((p) => {
                    const priority = PRIORITY_MAP[p.priority] ?? "Low";
                    const isSelected = p.id === selectedId;
                    const isHotspot = hotspots.some((h) => h.city === p.city && h.category === p.category);
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => setSelectedId(isSelected ? null : p.id)}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-secondary ${isSelected ? "bg-secondary border-l-2 border-ashoka" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {p.category}
                                {isHotspot && (
                                  <span className="ml-1.5 inline-block rounded bg-amber-100 px-1 py-0 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    HOTSPOT
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {p.city}{p.state ? `, ${p.state}` : ""}
                              </p>
                              {/* Complaint ID links directly to complaint detail */}
                              <Link
                                to="/complaints/$id"
                                params={{ id: p.id }}
                                className="mt-0.5 block text-[10px] font-mono text-ashoka hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {p.complaintNumber}
                              </Link>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_BG[priority]}`}>
                              {priority.toUpperCase()}
                            </span>
                          </div>
                          {isSelected && (
                            <p className="mt-1.5 text-[10px] text-ashoka font-medium">↑ Focused on map</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* AI Spatial Analysis */}
          <div className="rounded-xl border border-border bg-card p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-saffron" strokeWidth={1.5} />
              <h3 className="font-display text-sm font-semibold">AI Spatial Analysis</h3>
              {analyzed && hotspots.length > 0 && (
                <span className="ml-auto rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-semibold text-saffron">
                  {hotspots.length} detected
                </span>
              )}
            </div>

            {!analyzed && !analyzing && (
              <div className="flex items-start gap-2 mb-3 rounded-lg border border-border bg-secondary/60 px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Detects geographic clusters in the complaint database and ranks them by frequency and severity.
                </p>
              </div>
            )}

            {analyzing && (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-saffron" />
                Scanning {pins.length} complaint{pins.length !== 1 ? "s" : ""}…
              </div>
            )}

            {analyzed && !analyzing && hotspots.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {hotspots.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-secondary/60 text-[11px]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[h.severity] }} />
                    <span className="flex-1 min-w-0 truncate font-medium text-foreground">{h.category}</span>
                    <span className="text-muted-foreground shrink-0">{h.city}</span>
                    <SeverityBadge severity={h.severity} />
                  </li>
                ))}
              </ul>
            )}

            {analyzed && !analyzing && hotspots.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-2 mb-3">
                No significant clusters in current data.
              </p>
            )}

            <button
              onClick={runHotspotAnalysis}
              disabled={analyzing || loading || pins.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-ashoka/40 bg-ashoka/5 px-3 py-2 text-xs font-medium text-ashoka transition-colors hover:bg-ashoka/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
              ) : (
                <><TrendingUp className="h-3.5 w-3.5" /> {analyzed ? "Re-run Analysis" : "Detect Hotspots →"}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile: Grievances below map ─────────────────────────────────── */}
      <div className="mt-4 lg:hidden">
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">Active Grievances</h3>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {activePins.length} active
            </span>
          </div>
          {activePins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active grievances</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {activePins.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.category}</p>
                    <p className="text-xs text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ""}</p>
                    <Link
                      to="/complaints/$id"
                      params={{ id: p.id }}
                      className="text-[11px] font-mono text-ashoka hover:underline"
                    >
                      {p.complaintNumber}
                    </Link>
                  </div>
                  <SeverityBadge severity={PRIORITY_MAP[p.priority] ?? "Low"} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── AI Insights Table (full-width, below map) ────────────────────── */}
      {analyzed && hotspots.length > 0 && (
        <Panel className="mt-4 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-saffron" strokeWidth={1.5} />
            <h3 className="font-display text-base font-semibold">AI Insights</h3>
            <span className="ml-auto rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-medium text-saffron">
              {hotspots.length} hotspot{hotspots.length !== 1 ? "s" : ""} detected
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/60">
                  {["#", "Issue Category", "City", "State", "Complaints", "Severity"].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-[10px] ${i >= 4 ? "text-center" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {hotspots.map((h, i) => (
                  <tr key={i} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{h.category}</td>
                    <td className="px-4 py-3 text-foreground">{h.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.state}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{h.count}</td>
                    <td className="px-4 py-3 text-center"><SeverityBadge severity={h.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Analysis based on {pins.length} grievance{pins.length !== 1 ? "s" : ""} from the JanSeva complaint database ·
            Clusters detected by geographic density algorithm · Re-run after new complaints are filed.
          </p>
        </Panel>
      )}
    </div>
  );

  if (isOverlay) return content;

  return (
    <AppShell title="GeoVision" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "GeoVision" }]}>
      {content}
    </AppShell>
  );
}
