import { useEffect, useState } from "react";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Clock, ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { priorityTone, statusTone } from "@/lib/complaints";
import api from "@/lib/api";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface Escalation {
  id: string;
  complaintNumber: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
  citizen: { firstName: string; lastName: string; email: string };
  officer?: { firstName: string; lastName: string };
  department?: { name: string };
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

export function Escalations() {
  const [items, setItems] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });

  const load = (p = page) => {
    setLoading(true);
    api.get("/admin/escalations", { params: { page: p, limit: 20 } })
      .then(({ data: r }) => {
        setItems(r.data ?? []);
        setMeta(r.meta ?? { total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });
      })
      .catch(() => toast.error("Failed to load escalations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <AppShell title="Escalations" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Escalations" }]}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-display font-medium">High Priority Unresolved Complaints</p>
          <p className="text-sm text-muted-foreground">{meta.total} complaint{meta.total !== 1 ? "s" : ""} requiring immediate attention</p>
        </div>
      </div>

      {loading ? (
        <Panel className="p-8 text-center text-muted-foreground">Loading escalations...</Panel>
      ) : items.length === 0 ? (
        <Panel className="p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-display text-lg text-india-green">No active escalations</p>
          <p className="mt-1 text-sm text-muted-foreground">All high-priority complaints are resolved.</p>
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Complaint ID", "Title", "Priority", "Status", "Department / Officer", "Citizen", "Age", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const priority = mapPriority(item.priority);
                  const status = mapStatus(item.status);
                  const age = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
                  return (
                    <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="px-5 py-4 font-medium font-mono text-xs">{item.complaintNumber}</td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="truncate font-medium" title={item.title}>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.category.replace(/_/g, " ")}</p>
                        {item.city && <p className="text-xs text-muted-foreground">{item.city}{item.state ? `, ${item.state}` : ""}</p>}
                      </td>
                      <td className={`px-5 py-4 font-medium ${priorityTone[priority as keyof typeof priorityTone]}`}>
                        {item.priority}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone[status as keyof typeof statusTone]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <p>{item.department?.name ?? <span className="text-warning">Unassigned</span>}</p>
                        {item.officer && (
                          <p className="text-xs">{item.officer.firstName} {item.officer.lastName}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {item.citizen.firstName} {item.citizen.lastName}
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-xs text-destructive">
                          <Clock className="h-3.5 w-3.5" /> {age}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to="/complaints/$id"
                          params={{ id: item.id }}
                          className="flex items-center gap-1.5 text-ashoka hover:opacity-80"
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={!meta.hasPrevPage} onClick={() => { const p = page - 1; setPage(p); load(p); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button disabled={!meta.hasNextPage} onClick={() => { const p = page + 1; setPage(p); load(p); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}
    </AppShell>
  );
}
