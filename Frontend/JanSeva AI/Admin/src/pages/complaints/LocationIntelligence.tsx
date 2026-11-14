import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LIData {
  complaintId: string;
  generatedAt: string;
  origin: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    locality: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    road: string | null;
  };
  incident: {
    category: string;
    priority: string;
    impactRadiusMeters: number;
    department: string;
  };
  weather: {
    available: boolean;
    temperature?: string;
    condition?: string;
    observedAt?: string;
    source?: string;
  };
  infrastructure: {
    available: boolean;
    total: number;
    counts: Record<string, number>;
    summary: string[];
    namedItems: string[];
  };
  relatedComplaints: {
    withinRadius: number;
    sameCategoryCount: number;
    recurring: boolean;
    concentration: "LOW" | "MODERATE" | "HIGH";
  };
  evidence: {
    count: number;
    status: "PRESENT" | "ABSENT";
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score: number;
    breakdown: Record<string, number>;
    reasons: string[];
  };
  recommendation: {
    department: string;
    priority: string;
    action: string;
    reasons: (string | null)[];
  };
  sources: {
    name: string;
    status: "LIVE" | "UNAVAILABLE";
    fetchedAt: string;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function formatCat(raw: string) {
  return CATEGORY_LABELS[raw] ?? raw.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

function freshness(isoStr: string) {
  try {
    return formatDistanceToNow(new Date(isoStr), { addSuffix: true });
  } catch {
    return "unknown";
  }
}

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
};

const CONCENTRATION_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MODERATE: "#f97316",
  HIGH: "#ef4444",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  num,
  title,
  children,
  loading,
  error,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className="border-b border-border/60 pb-4 mb-4 last:border-0 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-saffron/15 text-[10px] font-bold text-saffron">
          {num}
        </span>
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {title}
        </span>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground animate-pulse">Loading...</div>
      ) : error ? (
        <div className="text-xs text-orange-500">{error}</div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LocationIntelligence({ complaintId }: { complaintId: string }) {
  const [data, setData] = useState<LIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefGenerated, setBriefGenerated] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLI = useCallback(async () => {
    if (!complaintId) return;
    // Cancel any previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setData(null);
    setBriefGenerated(null);
    setDispatched(false);
    setDispatchError(null);

    try {
      const res = await api.get(`/complaints/${complaintId}/location-intelligence`, {
        signal: abortRef.current.signal,
      });
      setData(res.data.data);
    } catch (err: any) {
      if (err.name !== "CanceledError" && err.name !== "AbortError") {
        setError(`Location intelligence analysis failed: ${err.message || String(err)}`);
        console.error("LI fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  // Fetch when complaintId changes
  useEffect(() => {
    fetchLI();
    return () => abortRef.current?.abort();
  }, [fetchLI]);

  // Generate brief
  const generateBrief = () => {
    if (!data) return;
    const d = data;
    const brief = `JANSEVA FIELD ACTION BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident ID:     ${d.complaintId}
Category:        ${formatCat(d.incident.category)}
Severity:        ${d.incident.priority}
Coordinates:     ${d.origin.latitude?.toFixed(6)}, ${d.origin.longitude?.toFixed(6)}
Address:         ${d.origin.address || "Unavailable"}
Locality:        ${d.origin.locality || "Unavailable"}
City:            ${d.origin.city || "Unavailable"}
State:           ${d.origin.state || "Unavailable"}
Impact radius:   ${d.incident.impactRadiusMeters} m

NEARBY SPATIAL CONTEXT
━━━━━━━━━━━━━━━━━━━━━━
${d.infrastructure.available && d.infrastructure.total > 0
      ? d.infrastructure.summary.join("\n")
      : "No critical infrastructure mapped within radius."}

Weather:         ${d.weather.available ? `${d.weather.condition}, ${d.weather.temperature}` : "Temporarily unavailable"}

RELATED COMPLAINTS
━━━━━━━━━━━━━━━━━━
Total within 1km:         ${d.relatedComplaints.withinRadius}
Same category nearby:     ${d.relatedComplaints.sameCategoryCount}
Recurring:                ${d.relatedComplaints.recurring ? "YES" : "NO"}

EVIDENCE & RISK
━━━━━━━━━━━━━━━
Evidence:        ${d.evidence.count} file${d.evidence.count !== 1 ? "s" : ""} uploaded
Spatial risk:    ${d.risk.level}
Risk score:      ${d.risk.score}
Risk reasons:
${d.risk.reasons.map((r) => `  - ${r}`).join("\n")}

DISPATCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━
Department:      ${d.recommendation.department}
Priority:        ${d.recommendation.priority}
Action:          ${d.recommendation.action}

DATA SOURCES
━━━━━━━━━━━━
${d.sources.map((s) => `${s.name}: ${s.status}`).join("\n")}

Generated:       ${format(new Date(d.generatedAt), "dd MMM yyyy, hh:mm a")}
`;
    setBriefGenerated(brief);
  };

  // Dispatch
  const handleDispatch = async () => {
    if (!data || !briefGenerated) return;
    setDispatching(true);
    setDispatchError(null);
    try {
      await api.put(`/complaints/${complaintId}/status`, {
        status: "ASSIGNED",
        note: briefGenerated,
      });
      setDispatched(true);
    } catch (err: any) {
      setDispatchError("Dispatch failed. Please retry.");
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg mb-4">Location Intelligence</h2>
        <div className="space-y-2">
          {[
            "Resolving location...",
            "Fetching weather...",
            "Analyzing nearby infrastructure...",
            "Checking related complaints...",
            "Verifying evidence...",
            "Calculating spatial risk...",
          ].map((msg) => (
            <div key={msg} className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-saffron/60 animate-ping" />
              {msg}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg mb-4">Location Intelligence</h2>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <button
          onClick={fetchLI}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!data) return null;

  const d = data;
  const riskColor = RISK_COLORS[d.risk.level] ?? "#6b7280";
  const concColor = CONCENTRATION_COLORS[d.relatedComplaints.concentration] ?? "#6b7280";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-5">
        <h2 className="font-display text-lg">Location Intelligence</h2>
        <button
          onClick={fetchLI}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
        >
          Refresh
        </button>
      </div>

      {/* 1. INCIDENT ORIGIN */}
      <Section num={1} title="Incident Origin">
        {d.origin.latitude != null ? (
          <div className="space-y-1">
            <p className="font-mono text-sm font-semibold">
              {d.origin.latitude.toFixed(6)}, {d.origin.longitude?.toFixed(6)}
            </p>
            <p className="text-xs text-muted-foreground">
              Area: {d.origin.locality && d.origin.city
                ? `${d.origin.locality}, ${d.origin.city}`
                : d.origin.address || "Locality information unavailable"}
            </p>
            {d.origin.road && (
              <p className="text-xs text-muted-foreground">Road: {d.origin.road}</p>
            )}
            {d.origin.state && (
              <p className="text-xs text-muted-foreground">{d.origin.state}{d.origin.postcode ? ` — ${d.origin.postcode}` : ""}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-destructive">Location Intelligence unavailable — complaint does not contain valid coordinates.</p>
        )}
      </Section>

      {/* 2. INCIDENT */}
      <Section num={2} title="Incident">
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-wide">{formatCat(d.incident.category)}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Severity: <strong className="text-foreground">{d.incident.priority}</strong></span>
            <span>Impact Radius: <strong className="text-foreground">{d.incident.impactRadiusMeters} m</strong></span>
          </div>
        </div>
      </Section>

      {/* 3. SPATIAL CONTEXT */}
      <Section num={3} title="Spatial Context">
        <div className="space-y-2">
          {/* Infrastructure summary */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Nearby mapped infrastructure:
            </p>
            {d.infrastructure.available && d.infrastructure.total > 0 ? (
              <ul className="text-xs text-foreground space-y-0.5">
                {d.infrastructure.summary.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-saffron" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : d.infrastructure.available ? (
              <p className="text-xs text-muted-foreground">No mapped critical infrastructure found within analysis radius.</p>
            ) : (
              <p className="text-xs text-orange-500">Infrastructure data temporarily unavailable.</p>
            )}
          </div>
          {/* Weather */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Weather:</p>
            {d.weather.available ? (
              <p className="text-xs">
                {d.weather.condition}, {d.weather.temperature}
              </p>
            ) : (
              <p className="text-xs text-orange-500">Weather temporarily unavailable</p>
            )}
          </div>
        </div>
      </Section>

      {/* 4. INFRASTRUCTURE IMPACT */}
      <Section num={4} title="Infrastructure Impact">
        {d.infrastructure.available ? (
          d.infrastructure.total > 0 ? (
            <div className="space-y-1">
              {d.infrastructure.summary.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs">
                  <span className="h-1 w-1 rounded-full bg-india-green" />
                  {s} within {d.incident.impactRadiusMeters}m
                </div>
              ))}
              {d.infrastructure.namedItems.length > 0 && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {d.infrastructure.namedItems.join(" • ")}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No mapped critical infrastructure found within the analysis radius.</p>
          )
        ) : (
          <p className="text-xs text-orange-500">Infrastructure analysis temporarily unavailable.</p>
        )}
      </Section>

      {/* 5. RELATED COMPLAINTS */}
      <Section num={5} title="Related Complaints">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {d.relatedComplaints.sameCategoryCount} similar {d.relatedComplaints.sameCategoryCount === 1 ? "issue" : "issues"} mapped
          </p>
          <div
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold"
            style={{ background: concColor + "18", color: concColor, border: `1px solid ${concColor}40` }}
          >
            {d.relatedComplaints.concentration} CONCENTRATION
          </div>
          <p className="text-xs text-muted-foreground">
            {d.relatedComplaints.withinRadius} complaint{d.relatedComplaints.withinRadius !== 1 ? "s" : ""} within 1km
          </p>
          <p className="text-xs text-muted-foreground">
            Recurring: <strong className="text-foreground">{d.relatedComplaints.recurring ? "YES" : "NO"}</strong>
            {d.relatedComplaints.recurring && " — Last 12 months"}
          </p>
        </div>
      </Section>

      {/* 6. EVIDENCE SPATIAL VERIFICATION */}
      <Section num={6} title="Evidence Spatial Verification">
        {d.evidence.count > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "#22c55e18", color: "#16a34a", border: "1px solid #22c55e40" }}
              >
                EVIDENCE PRESENT
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.evidence.count} file{d.evidence.count !== 1 ? "s" : ""} uploaded
            </p>
            <p className="text-xs text-muted-foreground">
              GPS EXIF verification requires server-side EXIF parsing (not yet available).
            </p>
          </div>
        ) : (
          <div>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "#f9731618", color: "#ea580c", border: "1px solid #f9731640" }}
            >
              UNVERIFIED — NO EVIDENCE UPLOADED
            </span>
          </div>
        )}
      </Section>

      {/* 7. SPATIAL RISK */}
      <Section num={7} title="Spatial Risk">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className="rounded-lg px-3 py-1 text-sm font-bold"
              style={{ background: riskColor + "18", color: riskColor, border: `1px solid ${riskColor}40` }}
            >
              {d.risk.level}
            </span>
            <span className="text-xs text-muted-foreground">Score: {d.risk.score}</span>
          </div>
          {d.risk.reasons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Why {d.risk.level}?
              </p>
              <ul className="space-y-0.5">
                {d.risk.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-xs">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-saffron" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 8. RECOMMENDATION */}
      <Section num={8} title="Recommendation">
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Department</p>
            <p className="text-sm font-bold">{d.recommendation.department}</p>
            <p className="text-xs text-muted-foreground">
              Priority: <strong className="text-foreground">{d.recommendation.priority}</strong>
            </p>
          </div>
          {d.recommendation.reasons.filter(Boolean).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Why this recommendation?
              </p>
              <ul className="space-y-0.5">
                {d.recommendation.reasons.filter(Boolean).map((r) => (
                  <li key={r!} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="mt-1">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 9. ACTION & DISPATCH */}
      <Section num={9} title="Action & Dispatch">
        <div className="space-y-3">
          {/* Step 1: Generate brief */}
          {!briefGenerated ? (
            <button
              onClick={generateBrief}
              className="w-full rounded-lg bg-saffron px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Generate Department Brief
            </button>
          ) : (
            <div>
              <div className="rounded-lg border border-border bg-muted p-3 mb-3">
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {briefGenerated}
                </pre>
              </div>
              {/* Step 2: Dispatch */}
              {dispatched ? (
                <div
                  className="rounded-lg px-4 py-3 text-sm font-bold text-center tracking-wide"
                  style={{ background: "#064e3b", color: "#10b981", border: "1px solid #047857" }}
                >
                  ✓ DISPATCHED TO {d.recommendation.department.toUpperCase()}
                </div>
              ) : (
                <div className="space-y-2">
                  {dispatchError && (
                    <p className="text-xs text-destructive">{dispatchError}</p>
                  )}
                  <button
                    onClick={handleDispatch}
                    disabled={dispatching}
                    className="w-full rounded-lg bg-india-green px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {dispatching ? "Dispatching..." : `Dispatch to ${d.recommendation.department}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* DATA SOURCES */}
      <div className="mt-2 pt-3 border-t border-border/60">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Data Sources & Freshness</p>
        <div className="space-y-1.5">
          {d.sources.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">{s.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={
                    s.status === "LIVE"
                      ? { background: "#22c55e18", color: "#16a34a" }
                      : { background: "#f9731618", color: "#ea580c" }
                  }
                >
                  {s.status}
                </span>
                <span className="text-[9px] text-muted-foreground">{freshness(s.fetchedAt)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Generated: {format(new Date(d.generatedAt), "dd MMM yyyy, hh:mm a")}
        </p>
      </div>
    </div>
  );
}
