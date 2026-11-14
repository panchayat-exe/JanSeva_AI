import { useEffect, useState } from "react";
import { FileText, Users, CheckCircle2, Star, Clock, AlertTriangle } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { format, parseISO } from "date-fns";

interface Analytics {
  totalComplaints: number;
  totalUsers: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  averageRating: string | null;
  trend: { date: string; count: number }[];
  byDepartment: { name: string; total: number; resolved: number; pending: number }[];
  resolutionPerformance: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3b82f6",
  ASSIGNED: "#f59e0b",
  IN_PROGRESS: "#f97316",
  RESOLVED: "#10b981",
  CLOSED: "#6b7280",
  REJECTED: "#ef4444",
  REOPENED: "#a855f7",
  DRAFT: "#94a3b8",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-green-500",
};

// Simple skeleton for KPI
function KPISkeleton() {
  return (
    <Panel className="p-5">
      <div className="h-6 w-6 animate-pulse rounded-md bg-muted"></div>
      <div className="mt-4 h-8 w-16 animate-pulse rounded bg-muted"></div>
      <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted"></div>
    </Panel>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAnalytics = () => {
    setLoading(true);
    setError(false);
    api.get("/admin/reports/analytics")
      .then(({ data: r }) => setData(r.data))
      .catch(() => {
        toast.error("Failed to load analytics");
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (error) {
    return (
      <AppShell title="Analytics" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]}>
        <Panel className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="mb-2 font-display text-lg">Unable to load analytics</h2>
          <p className="mb-6 text-sm text-muted-foreground">There was a problem connecting to the server.</p>
          <button onClick={fetchAnalytics} className="rounded-lg bg-saffron px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-saffron/90">
            Retry
          </button>
        </Panel>
      </AppShell>
    );
  }

  if (loading || !data) {
    return (
      <AppShell title="Analytics" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]}>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="h-80 animate-pulse bg-muted/20 p-6"></Panel>
          <Panel className="h-80 animate-pulse bg-muted/20 p-6"></Panel>
        </div>
      </AppShell>
    );
  }

  const resolvedCount = data.byStatus.find((s) => s.status === "RESOLVED")?.count ?? 0;
  const closedCount = data.byStatus.find((s) => s.status === "CLOSED")?.count ?? 0;
  const resolvedTotal = resolvedCount + closedCount;
  const resolutionRate = data.totalComplaints > 0
    ? Math.round((resolvedTotal / data.totalComplaints) * 100)
    : 0;

  const maxCategoryCount = Math.max(...data.byCategory.map((c) => c.count), 1);
  const maxPriorityCount = Math.max(...data.byPriority.map((p) => p.count), 1);

  // Format trend data
  const trendData = data.trend.map(t => ({
    name: format(parseISO(t.date), "dd MMM"),
    Complaints: t.count
  }));

  return (
    <AppShell title="Analytics" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]}>
      
      {/* ROW 1: KPI CARDS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Complaints */}
        <Panel className="border border-border/50 p-5 shadow-sm">
          <FileText className="h-5 w-5 text-ashoka" strokeWidth={1.5} />
          {data.totalComplaints > 0 ? (
            <p className="mt-4 font-display text-3xl">{data.totalComplaints}</p>
          ) : (
            <p className="mt-4 font-display text-3xl text-muted-foreground">—</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">Total Complaints</p>
        </Panel>

        {/* Registered Citizens */}
        <Panel className="border border-border/50 p-5 shadow-sm">
          <Users className="h-5 w-5 text-saffron" strokeWidth={1.5} />
          <p className="mt-4 font-display text-3xl">{data.totalUsers}</p>
          <p className="mt-1 text-sm text-muted-foreground">Registered Citizens</p>
        </Panel>

        {/* Resolution Rate */}
        <Panel className="border border-border/50 p-5 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-india-green" strokeWidth={1.5} />
          {data.totalComplaints > 0 ? (
            <div className="mt-4 flex items-baseline gap-2">
              <p className="font-display text-3xl">{resolutionRate}%</p>
              <p className="text-xs text-muted-foreground">({resolvedTotal} resolved)</p>
            </div>
          ) : (
            <p className="mt-4 font-display text-3xl text-muted-foreground">—</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">Resolution Rate</p>
        </Panel>

        {/* Average Rating */}
        <Panel className="border border-border/50 p-5 shadow-sm">
          <Star className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
          {data.averageRating ? (
            <p className="mt-4 font-display text-3xl">{data.averageRating} <span className="text-lg text-muted-foreground">/ 5</span></p>
          ) : (
            <p className="mt-4 font-display text-xl text-muted-foreground">—</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{data.averageRating ? "Avg. Rating" : "No ratings yet"}</p>
        </Panel>
      </div>

      {/* ROW 2: TREND & STATUS */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Complaints Over Time */}
        <Panel className="border border-border/50 p-6 shadow-sm">
          <h2 className="mb-5 font-display text-lg">Complaints Over Time</h2>
          {trendData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000080" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#000080" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="Complaints" stroke="#000080" strokeWidth={2} fillOpacity={1} fill="url(#colorComplaints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">No historical data available</p>
            </div>
          )}
        </Panel>

        {/* Complaints by Status */}
        <Panel className="border border-border/50 p-6 shadow-sm">
          <h2 className="mb-5 font-display text-lg">Complaints by Status</h2>
          {data.byStatus.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">No complaint data available</p>
            </div>
          ) : (
            <div className="flex h-64 items-center">
              <div className="h-full w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {data.byStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [value, 'Complaints']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3 pl-4">
                {data.byStatus.map((s) => {
                  const pct = Math.round((s.count / data.totalComplaints) * 100);
                  return (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || "#94a3b8" }}></span>
                        <span className="capitalize">{s.status.replace(/_/g, " ").toLowerCase()}</span>
                      </div>
                      <div className="flex gap-3 text-muted-foreground">
                        <span className="w-6 text-right font-medium text-foreground">{s.count}</span>
                        <span className="w-8 text-right text-xs">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ROW 3: PRIORITY & DEPARTMENT */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Complaints by Priority */}
        <Panel className="border border-border/50 p-6 shadow-sm">
          <h2 className="mb-5 font-display text-lg">Complaints by Priority</h2>
          <div className="space-y-5">
            {data.byPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground">No complaint data available</p>
            ) : (
              data.byPriority.map((p) => {
                const pct = Math.round((p.count / data.totalComplaints) * 100);
                return (
                  <div key={p.priority}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{p.priority.toLowerCase()}</span>
                      <span className="text-muted-foreground">{p.count} <span className="text-xs">({pct}%)</span></span>
                    </div>
                    <ProgressBar value={p.count} max={maxPriorityCount} color={PRIORITY_COLORS[p.priority] ?? "bg-ashoka"} />
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Complaints by Department */}
        {data.byDepartment && data.byDepartment.length > 0 && (
          <Panel className="border border-border/50 p-6 shadow-sm">
            <h2 className="mb-5 font-display text-lg">Complaints by Department</h2>
            <div className="space-y-4">
              {data.byDepartment.slice(0, 5).map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.total} total complaints</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-india-green">{d.resolved} Resolved</p>
                    <p className="text-xs text-amber-500">{d.pending} Pending</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* ROW 4: CATEGORY & PERFORMANCE */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Categories */}
        <Panel className="border border-border/50 p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 font-display text-lg">Top Complaint Categories</h2>
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No complaint categories available</p>
          ) : (
            <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
              {data.byCategory.slice(0, 8).map((c) => (
                <div key={c.category}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="capitalize">{c.category.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                  <ProgressBar value={c.count} max={maxCategoryCount} color="bg-ashoka" />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Resolution Performance */}
        <Panel className="flex flex-col justify-between border border-border/50 p-6 shadow-sm">
          <div>
            <h2 className="mb-5 font-display text-lg">Resolution Performance</h2>
            {data.resolutionPerformance !== null ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Clock className="mb-4 h-10 w-10 text-india-green opacity-80" />
                <p className="font-display text-4xl">{data.resolutionPerformance}</p>
                <p className="mt-1 text-sm text-muted-foreground">Average days to resolve</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-2xl text-muted-foreground">—</p>
                <p className="mt-1 text-sm text-muted-foreground">Not enough data to calculate</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

    </AppShell>
  );
}
