import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Eye, MapPin, UserCircle2 } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { statusTone } from "@/lib/complaints";
import { useEffect, useState, useRef } from "react";
import api, { SERVER_URL } from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/lib/useAuth";
import { ComplaintGeoViewer } from "./ComplaintGeoViewer";
import { LocationIntelligence } from "./LocationIntelligence";
import "leaflet/dist/leaflet.css";

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SUPPLY: "Water Supply", ELECTRICITY: "Electricity",
  GARBAGE_SANITATION: "Garbage & Sanitation", ROADS_INFRASTRUCTURE: "Roads & Infrastructure",
  DRAINAGE_SEWAGE: "Drainage & Sewage", STREET_LIGHTS: "Street Lights",
  PARKS_RECREATION: "Parks & Recreation", BUILDING_PERMITS: "Building Permits",
  NOISE_POLLUTION: "Noise Pollution", AIR_POLLUTION: "Air Pollution",
  PUBLIC_TRANSPORT: "Public Transport", LAW_AND_ORDER: "Law & Order",
  HEALTH_SERVICES: "Health Services", EDUCATION: "Education", OTHER: "Other",
};

const CITY_STATE: Record<string, string> = {
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra",
  "new delhi": "Delhi", delhi: "Delhi",
  bengaluru: "Karnataka", bangalore: "Karnataka",
  hyderabad: "Telangana", chennai: "Tamil Nadu", kolkata: "West Bengal",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat", rajkot: "Gujarat",
  jaipur: "Rajasthan", jodhpur: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", agra: "Uttar Pradesh", varanasi: "Uttar Pradesh",
  bhopal: "Madhya Pradesh", indore: "Madhya Pradesh",
  patna: "Bihar", bhubaneswar: "Odisha", guwahati: "Assam",
  chandigarh: "Chandigarh", ludhiana: "Punjab", amritsar: "Punjab",
  dehradun: "Uttarakhand", shimla: "Himachal Pradesh", ranchi: "Jharkhand",
  raipur: "Chhattisgarh", kochi: "Kerala", thiruvananthapuram: "Kerala",
  visakhapatnam: "Andhra Pradesh", vijayawada: "Andhra Pradesh",
  srinagar: "Jammu & Kashmir", jammu: "Jammu & Kashmir",
};

function resolveLocation(city?: string | null, state?: string | null): string {
  if (!city) return "India";
  const resolvedState = state || CITY_STATE[city.toLowerCase()] || "";
  return resolvedState ? `${city}, ${resolvedState}` : city;
}

function formatCategory(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

const mapPriority = (p: string) => {
  if (p === "CRITICAL" || p === "HIGH") return "High";
  if (p === "MEDIUM") return "Medium";
  return "Low";
};

const mapStatus = (s: string) => {
  if (s === "SUBMITTED" || s === "UNDER_REVIEW") return "Pending";
  if (s === "ASSIGNED") return "Assigned";
  if (s === "IN_PROGRESS" || s === "REOPENED") return "In Progress";
  if (s === "RESOLVED" || s === "CLOSED" || s === "REJECTED") return "Resolved";
  return "Pending";
};

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{k}</span>
      <span className="text-muted-foreground/60">:</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

export function ComplaintDetails() {
  const { id } = useParams({ from: "/complaints/$id/" });
  const { role } = useAuth();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [geoViewerOpen, setGeoViewerOpen] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const response = await api.get(`/complaints/${id}`);
        const data = response.data.data;
        setC({
          ...data,
          category: formatCategory(data.category ?? "OTHER"),
          priority: mapPriority(data.priority),
          rawStatus: data.status,
          status: mapStatus(data.status),
          displayLocation: resolveLocation(data.city, data.state),
          reportedOn: format(new Date(data.createdAt), "dd MMM yyyy, hh:mm a"),
          reportedBy: `${data.citizen?.firstName ?? ""} ${data.citizen?.lastName ?? ""}`.trim() || "Citizen",
          mobile: data.citizen?.phone || "N/A"
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaint();
  }, [id]);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const lat = parseFloat(c?.latitude);
    const lng = parseFloat(c?.longitude);
    if (!mapDivRef.current || isNaN(lat) || isNaN(lng)) return;

    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapDivRef.current) return;
      const Lf = L.default ?? L;

      // Ensure no double init
      if (mapInstanceRef.current) return;

      delete (Lf.Icon.Default.prototype as any)._getIconUrl;
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = Lf.map(mapDivRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
      });

      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      Lf.marker([lat, lng]).addTo(map);
      mapInstanceRef.current = map;
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [c?.latitude, c?.longitude]);

  if (loading) {
    return (
      <AppShell
        title="Complaint Details"
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Complaints", to: "/complaints" }, { label: "Loading..." }]}
      >
        <Panel className="p-10 text-center text-muted-foreground">Loading details...</Panel>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell
        title="Complaint Details"
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Complaints", to: "/complaints" }, { label: "Not found" }]}
      >
        <Panel className="p-10 text-center text-muted-foreground">
          No complaint found with ID {id}.
        </Panel>
      </AppShell>
    );
  }

  const stripEmojis = (str: string) => str ? str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() : str;

  const timeline = c.timeline?.map((h: any, i: number) => ({
    time: format(new Date(h.createdAt), "dd MMM yyyy, hh:mm a"),
    label: stripEmojis(h.title || h.eventType),
    desc: stripEmojis(h.description),
    by: h.actorName || "System",
    done: true
  })) || [{ time: c.reportedOn, label: "Complaint Registered", by: "Citizen", done: true }];

  const lat = parseFloat(c.latitude);
  const lng = parseFloat(c.longitude);
  const hasGps = !isNaN(lat) && !isNaN(lng);

  return (
    <AppShell
      title="Complaint Details"
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Complaints", to: "/complaints" },
        { label: "Complaint Details" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-6">
          <h2 className="font-display text-lg">Complaint Overview</h2>
          <div className="mt-4 divide-y divide-border/60">
            <Row k="Complaint ID" v={c.complaintNumber || c.id} />
            <Row k="Category" v={c.category} />
            <Row k="Priority" v={c.priority} />
            <div className="flex items-center gap-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-muted-foreground">Status</span>
              <span className="text-muted-foreground/60">:</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone[c.status as keyof typeof statusTone]}`}>
                {c.status}
              </span>
            </div>
            <Row k="Reported On" v={c.reportedOn} />
            <Row k="Reported By" v={c.reportedBy} />
            <Row k="Mobile Number" v={c.mobile} />
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <MapPin className="h-4 w-4 text-saffron" /> Location
          </h2>
          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Address</p>
          <p className="mt-1 text-sm leading-relaxed">{c.address || c.displayLocation}</p>
          <div className="mt-5 divide-y divide-border/60">
            <Row k="Latitude" v={hasGps ? c.latitude : "N/A"} />
            <Row k="Longitude" v={hasGps ? c.longitude : "N/A"} />
            <Row k="GPS Status" v={hasGps ? "✓ Verified" : "⚠ Not Verified"} />
          </div>
        </Panel>

        <Panel className="overflow-hidden flex flex-col">
          <div className="relative flex-1 bg-surface-2 min-h-[220px] z-0">
            {hasGps ? (
              <div ref={mapDivRef} className="h-full w-full absolute inset-0 z-0" />
            ) : (
               <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground bg-muted">
                 Location Not Available
               </div>
            )}
          </div>
          <div className="space-y-2 p-5 text-sm z-10 bg-card border-t border-border">
            <Row k="Landmark" v={c.landmark || "N/A"} />
            <Row k="Nearest Road" v={c.nearestRoad || "N/A"} />
            
            <button
              onClick={() => setGeoViewerOpen(true)}
              className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-ashoka/50 bg-ashoka/10 px-4 py-2 text-sm text-ashoka hover:bg-ashoka/20 transition-colors"
              aria-label="Open complaint in GeoVision spatial viewer"
            >
              <Eye className="h-4 w-4" /> View on GeoVision
            </button>

            {/* ComplaintGeoViewer — full-screen overlay, GeoVision.tsx is untouched */}
            <ComplaintGeoViewer
              complaint={c}
              open={geoViewerOpen}
              onClose={() => setGeoViewerOpen(false)}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 className="font-display text-lg">Complaint Description</h2>
          <h3 className="mt-4 font-semibold text-sm">{c.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="text-sm">Uploaded Images ({c.media?.length || 0})</p>
            {c.media && c.media.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                {c.media.map((m: any) => {
                  const src = m.url.startsWith("/") ? `${SERVER_URL}${m.url}` : m.url;
                  return (
                    <a
                      key={m.id}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={src}
                        alt={m.fileName}
                        crossOrigin="anonymous"
                        className="w-full rounded-xl border border-border object-cover aspect-video hover:opacity-90 transition-opacity bg-muted"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          const placeholder = document.createElement("div");
                          placeholder.className = "flex w-full aspect-video items-center justify-center rounded-xl border border-border bg-muted text-xs text-muted-foreground break-all p-2 text-center";
                          placeholder.textContent = m.fileName || "Unknown file";
                          el.parentElement?.appendChild(placeholder);
                        }}
                      />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 flex gap-3">
                 <div className="text-xs text-muted-foreground">No images uploaded</div>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-lg">Complaint Timeline</h2>
          <ol className="mt-5 space-y-6">
            {timeline.map((t: any, i: number) => (
              <li key={i} className="relative flex gap-4 pl-1">
                <span
                  className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                    t.done ? "border-india-green bg-india-green/30" : "border-dashed border-border"
                  }`}
                />
                {i < timeline.length - 1 && (
                  <span className="absolute left-[6px] top-6 h-full w-px bg-border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.time}</p>
                  <p className="text-sm font-semibold">{t.label}</p>
                  {t.desc && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{t.desc}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium bg-secondary px-2 py-1 rounded-md h-fit">{t.by}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* ── Location Intelligence Panel ─────────────────────────────────── */}
      {hasGps && (
        <div className="mt-6">
          <LocationIntelligence complaintId={c.id} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/complaints"
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Complaints
        </Link>
        <div className="flex flex-wrap gap-3">
          {/* View Progress — enabled only when work has started */}
          <Link
            to="/complaints/$id/progress"
            params={{ id: c.id }}
            disabled={!["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "AWAITING_CITIZEN_VERIFICATION", "REOPENED"].includes(c.rawStatus)}
            className={`rounded-lg border border-border px-5 py-2.5 text-sm transition-colors ${
              ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "AWAITING_CITIZEN_VERIFICATION", "REOPENED"].includes(c.rawStatus)
                ? "hover:bg-accent"
                : "pointer-events-none opacity-40"
            }`}
          >
            View Progress
          </Link>
          {role !== "OFFICER" && (
            <Link
              to="/complaints/$id/assign"
              params={{ id: c.id }}
              className="flex items-center gap-2 rounded-lg bg-saffron px-5 py-2.5 text-sm font-medium text-saffron-foreground transition-opacity hover:opacity-90"
            >
              <UserCircle2 className="h-4 w-4" />
              Assign Complaint
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
