import { Link } from "@tanstack/react-router";
import {
  ArrowRight, CheckCircle2, Clock, FileText,
  RefreshCw, AlertTriangle, MapPin, TrendingUp,
  Sun, CloudSun, Moon, Timer,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { statusTone, priorityTone, formatCategory, resolveLocation } from "@/lib/complaints";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
}
const GREETING_META = {
  goodMorning:   { Icon: Sun,      color: "text-amber-500",  text: "Good Morning" },
  goodAfternoon: { Icon: CloudSun, color: "text-orange-500", text: "Good Afternoon" },
  goodEvening:   { Icon: Moon,     color: "text-indigo-400", text: "Good Evening" },
};

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

export function DashboardOfficer() {
  const { user, fullName } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/dashboard/officer")
      .then(({ data: r }) => setData(r.data))
      .catch((e) => {
        console.error("[OfficerDashboard]", e?.response?.status, e?.message);
        setError("Failed to load dashboard. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, []);

  const key = getGreetingKey();
  const { Icon: GreetingIcon, color: greetingColor, text: greeting } = GREETING_META[key];

  if (loading) {
    return (
      <AppShell title="Officer Dashboard" crumbs={[{ label: "Dashboard" }]}>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ashoka border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Officer Dashboard" crumbs={[{ label: "Dashboard" }]}>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive/60" />
          <p className="text-muted-foreground">{error ?? "Dashboard data unavailable."}</p>
          <button onClick={() => window.location.reload()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Retry</button>
        </div>
      </AppShell>
    );
  }

  const { stats, recentComplaints } = data;

  const statCards = [
    { label: "Total Assigned", value: stats.total,      icon: FileText,     tone: "text-ashoka",       bg: "bg-ashoka/10 border-ashoka/30" },
    { label: "Pending",        value: stats.pending,    icon: Clock,        tone: "text-amber-500",    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30" },
    { label: "In Progress",    value: stats.inProgress, icon: RefreshCw,    tone: "text-saffron",      bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30" },
    { label: "Resolved",       value: stats.resolved,   icon: CheckCircle2, tone: "text-india-green",  bg: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30" },
  ];

  return (
    <AppShell title="Officer Dashboard" crumbs={[{ label: "Dashboard" }]}>
      {/* Greeting */}
      <div className="mb-6 flex flex-col gap-1 sm:mb-8">
        <div className="flex items-center gap-3">
          <span className={`shrink-0 ${greetingColor}`}>
            <GreetingIcon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
          </span>
          <h1 className="font-display text-xl font-semibold sm:text-2xl lg:text-3xl">
            {greeting}, {user?.firstName ?? "Officer"}!
          </h1>
        </div>
        <p className="ml-11 text-sm text-muted-foreground sm:ml-12 lg:ml-14">
          Your assigned grievances and field actions
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone, bg }) => (
          <Panel key={label} className={`p-5 border ${bg}`}>
            <Icon className={`h-6 w-6 ${tone}`} strokeWidth={1.5} />
            <p className="mt-4 font-display text-3xl">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </Panel>
        ))}
      </div>

      {/* Quick action strip */}
      <div className="mt-6 flex w-full flex-col gap-4 sm:flex-row">
        <Panel className="flex flex-1 items-center gap-3 p-4 text-sm">
          <Clock className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-500">
              SLA Reminder — {stats.pending} complaints pending action
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
              Review pending complaints regularly to maintain SLA compliance.
            </p>
          </div>
        </Panel>

        <Panel className="flex items-center gap-3 p-4 text-sm w-full sm:w-auto min-w-[220px]">
          <TrendingUp className="h-5 w-5 text-saffron" strokeWidth={1.5} />
          <div>
            <p className="font-medium">Resolution Rate</p>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% resolved
            </p>
          </div>
        </Panel>
      </div>

      {/* Recent complaints table */}
      <Panel className="mt-6">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="font-display text-xl">My Assigned Complaints</h2>
          <Link
            to="/complaints"
            className="flex items-center gap-2 text-sm text-ashoka transition-opacity hover:opacity-80"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Complaint ID", "Category", "Location", "Priority", "Status", "Action"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No complaints assigned yet.
                  </td>
                </tr>
              ) : (
                recentComplaints.map((c: any) => {
                  const mp = mapPriority(c.priority);
                  const ms = mapStatus(c.status);
                  return (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="px-6 py-4 font-medium">{c.complaintNumber || c.id}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatCategory(c.category)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{resolveLocation(c.city, c.state)}</td>
                      <td className={`px-6 py-4 font-medium ${priorityTone[mp as keyof typeof priorityTone]}`}>{mp}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone[ms as keyof typeof statusTone]}`}>
                          {ms}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

    </AppShell>
  );
}
