import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  PlusCircle,
  RefreshCw,
  Sun,
  CloudSun,
  Moon,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { statusTone, priorityTone, formatCategory, resolveLocation } from "@/lib/complaints";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

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

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const hour = new Date(istString).getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

const GREETING_META = {
  goodMorning:   { Icon: Sun,      color: "text-amber-500", text: "Good Morning" },
  goodAfternoon: { Icon: CloudSun, color: "text-orange-500", text: "Good Afternoon" },
  goodEvening:   { Icon: Moon,     color: "text-indigo-400", text: "Good Evening" },
};


export function Dashboard() {
  const { user, fullName, isOfficer, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Officers should not be on /dashboard — redirect to their own view
  useEffect(() => {
    if (isOfficer) {
      navigate({ to: "/dashboard/officer" });
      return;
    }
    api
      .get("/dashboard/admin")
      .then(({ data: r }) => setData(r.data))
      .catch((e) => console.error("[Dashboard] fetch error:", e?.response?.status))
      .finally(() => setLoading(false));
  }, [isOfficer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <AppShell title="Dashboard" crumbs={[{ label: "Dashboard" }]}>
        <div className="p-6">Loading dashboard...</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Dashboard" crumbs={[{ label: "Dashboard" }]}>
        <div className="p-6">Failed to load dashboard data.</div>
      </AppShell>
    );
  }

  const { complaintStats, recentComplaints, categoryBreakdown } = data;

  const stats = [
    { label: "Total Complaints", value: complaintStats.total, icon: FileText, tone: "text-ashoka" },
    { label: "Pending", value: complaintStats.pending, icon: Clock, tone: "text-warning" },
    { label: "In Progress", value: complaintStats.inProgress, icon: RefreshCw, tone: "text-saffron" },
    { label: "Resolved", value: complaintStats.resolved, icon: CheckCircle2, tone: "text-india-green" },
  ];

  const key = getGreetingKey();
  const { Icon: GreetingIcon, color: greetingColor, text: greeting } = GREETING_META[key];

  const dashboardTitle = isSuperAdmin ? "Command Center" : "Department Dashboard";
  const dashboardSubtitle = isSuperAdmin
    ? "System-wide grievance monitoring and administration"
    : "Monitor and manage your department's grievances";

  return (
    <AppShell title={dashboardTitle} crumbs={[{ label: dashboardTitle }]}>
      {/* Greeting */}
      <div className="mb-6 flex flex-col gap-1 sm:mb-8">
        <div className="flex items-center gap-3">
          <span className={`shrink-0 ${greetingColor}`}>
            <GreetingIcon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
          </span>
          <h1 className="font-display text-xl font-semibold sm:text-2xl lg:text-3xl">
            {greeting}, {user?.firstName ?? "Admin"}!
          </h1>
        </div>
        <p className="ml-11 text-sm text-muted-foreground sm:ml-12 lg:ml-14">{dashboardSubtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Panel key={label} className="p-5">
            <Icon className={`h-6 w-6 ${tone}`} strokeWidth={1.5} />
            <p className="mt-4 font-display text-3xl">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-6 p-6">
        <h2 className="font-display text-xl">Category Breakdown</h2>
        <div className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
          {categoryBreakdown.map((cat: any) => (
            <div
              key={cat.category}
              className="flex items-center gap-3 border-b border-border/60 pb-4 last:border-0"
            >
              <span className="rounded-full border border-ashoka/40 bg-ashoka/10 p-2">
                <PlusCircle className="h-4 w-4 text-ashoka" strokeWidth={1.7} />
              </span>
              <p className="text-sm text-muted-foreground">{cat.category}: {cat.count} complaints</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="font-display text-xl">Recent Complaints</h2>
          <Link
            to="/complaints"
            className="flex items-center gap-2 text-sm text-ashoka transition-opacity hover:opacity-80"
          >
            View all complaints <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Complaint ID", "Category", "Location", "Priority (AI)", "Status", "Action"].map(
                  (h) => (
                    <th key={h} className="px-6 py-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {recentComplaints.slice(0, 5).map((c: any) => {
                const mappedPriority = mapPriority(c.priority);
                const mappedStatus = mapStatus(c.status);
                return (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="px-6 py-4 font-medium">{c.complaintNumber || c.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatCategory(c.category)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{resolveLocation(c.city, c.state)}</td>
                  <td className={`px-6 py-4 font-medium ${priorityTone[mappedPriority as keyof typeof priorityTone]}`}>
                    {mappedPriority}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${statusTone[mappedStatus as keyof typeof statusTone]}`}
                    >
                      {mappedStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to="/complaints/$id"
                      params={{ id: c.id }}
                      className="flex items-center gap-1.5 text-ashoka hover:opacity-80"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
