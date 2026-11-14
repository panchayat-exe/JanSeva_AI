import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download, MapPin, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { priorityTone, statusTone } from "@/lib/complaints";
import api from "@/lib/api";
import { format } from "date-fns";

const selectCls =
  "h-10 rounded-lg border border-input bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-ashoka";

// ── City → State (fallback when backend returns null state) ─────────────────
const CITY_STATE_MAP: Record<string, string> = {
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra", aurangabad: "Maharashtra",
  "new delhi": "Delhi", delhi: "Delhi",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka", mysore: "Karnataka",
  hyderabad: "Telangana",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu",
  kolkata: "West Bengal", howrah: "West Bengal",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat", rajkot: "Gujarat",
  jaipur: "Rajasthan", jodhpur: "Rajasthan", udaipur: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", agra: "Uttar Pradesh", varanasi: "Uttar Pradesh", meerut: "Uttar Pradesh",
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
};

function resolveLocation(city: string | null | undefined, state: string | null | undefined): string {
  if (!city) return "India";
  const resolvedState = state || CITY_STATE_MAP[city.toLowerCase()] || "";
  return resolvedState ? `${city}, ${resolvedState}` : city;
}

// ── Category display labels ──────────────────────────────────────────────────
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

const formatCategory = (c: string) =>
  CATEGORY_LABELS[c] ?? c.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

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

export function ComplaintsList() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [sortBy, setSortBy] = useState("Latest");
  
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const response = await api.get("/complaints", {
          params: { page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" }
        });
        const raw = response.data.data;
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        
        const mapped = items.map((c: any) => ({
          id: c.id,
          createdAt: c.createdAt,
          complaintNumber: c.complaintNumber || c.id,
          category: formatCategory(c.category),
          rawCategory: c.category,
          location: resolveLocation(c.city, c.state),
          priority: mapPriority(c.priority),
          status: mapStatus(c.status),
          reportedOn: format(new Date(c.createdAt), "dd MMM yyyy, hh:mm a")
        }));
        
        setComplaints(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const rows = complaints.filter((c) => {
    const q = query.trim().toLowerCase();
    return (
      (!q ||
        c.complaintNumber.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)) &&
      (statusFilter === "All Status" || c.status === statusFilter) &&
      (categoryFilter === "All Categories" || c.category === categoryFilter) &&
      (priorityFilter === "All Priorities" || c.priority === priorityFilter)
    );
  });

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "Latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "Oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "Priority") {
      const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (diff === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return diff;
    }
    return 0;
  });

  const handleExport = () => {
    if (sortedRows.length === 0) return;
    const headers = ["Complaint ID", "Category", "Location", "Priority", "Status", "Reported On"];
    const csvContent = [
      headers.join(","),
      ...sortedRows.map(row => 
        [
          `"${row.complaintNumber}"`, 
          `"${row.category}"`, 
          `"${row.location}"`, 
          `"${row.priority}"`, 
          `"${row.status}"`, 
          `"${row.reportedOn}"`
        ].join(",")
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Complaints_Export_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AppShell
        title="Complaints"
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Complaints" }]}
      >
        <div className="p-6">Loading complaints...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Complaints"
      crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Complaints" }]}
    >
      <Panel className="flex flex-wrap items-end gap-4 p-5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Complaint ID, Category, Location..."
            className="h-10 w-full rounded-lg border border-input bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ashoka"
          />
        </div>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            {["All Status", "Pending", "Assigned", "In Progress", "Resolved"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectCls}
          >
            {["All Categories", ...Array.from(new Set(complaints.map((c) => c.category)))].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Priority
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={selectCls}
          >
            {["All Priorities", "High", "Medium", "Low"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <button 
          onClick={handleExport}
          className="flex h-10 items-center gap-2 rounded-lg border border-saffron/50 bg-saffron/10 px-4 text-sm font-medium text-saffron transition-colors hover:bg-saffron/20"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </Panel>

      <Panel className="mt-6">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="font-display text-lg">All Complaints ({sortedRows.length})</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort by
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className={selectCls}
            >
              <option value="Latest">Latest</option>
              <option value="Oldest">Oldest</option>
              <option value="Priority">Priority</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Complaint ID", "Category", "Location", "Priority", "Status", "Reported On", "Action"].map(
                  (h) => (
                    <th key={h} className="px-6 py-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((c: any) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="px-6 py-4 font-medium">{c.complaintNumber}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.category}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-saffron" /> {c.location}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-medium ${priorityTone[c.priority as keyof typeof priorityTone]}`}>{c.priority}</td>
                  <td className="px-6 py-4">
                    <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${statusTone[c.status as keyof typeof statusTone]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{c.reportedOn}</td>
                  <td className="px-6 py-4">
                    <Link
                      to="/complaints/$id"
                      params={{ id: c.id }}
                      className="text-ashoka underline-offset-4 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No complaints match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm text-muted-foreground">
          <span>
            Showing {rows.length > 0 ? 1 : 0} to {rows.length} of {rows.length} complaints
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-border p-2 hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="rounded-md border border-ashoka px-3 py-1.5 text-ashoka">1</span>
            <button className="rounded-md border border-border p-2 hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
