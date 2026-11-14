import { useEffect, useState } from "react";
import {
  ClipboardList, ChevronLeft, ChevronRight, Search, Filter,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
  user?: { email: string; firstName: string; lastName: string };
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  LOGIN:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  LOGOUT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  VIEW:   "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  EXPORT: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  ASSIGN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });

  const load = (p = page) => {
    setLoading(true);
    api.get("/admin/audit-logs", { params: { page: p, limit: 50 } })
      .then(({ data: r }) => {
        setLogs(r.data ?? []);
        setMeta(r.meta ?? { total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });
      })
      .catch((e) => {
        if (e?.response?.status === 403) {
          toast.error("Access denied. Audit logs require Super Admin access.");
        } else {
          toast.error("Failed to load audit logs");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <AppShell title="Audit Logs" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Audit Logs" }]}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          {meta.total} log entries
        </div>
      </div>

      {loading ? (
        <Panel className="p-8 text-center text-muted-foreground">Loading audit logs...</Panel>
      ) : logs.length === 0 ? (
        <Panel className="p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-display text-lg">No audit logs found</p>
          <p className="mt-1 text-sm text-muted-foreground">System actions will appear here as they occur.</p>
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Timestamp", "User", "Action", "Resource", "Description", "IP Address"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="px-5 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-xs">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ACTION_BADGE[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      <p>{log.resource}</p>
                      {log.resourceId && (
                        <p className="font-mono text-[10px] opacity-60 truncate max-w-[80px]" title={log.resourceId}>
                          {log.resourceId.substring(0, 8)}...
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs max-w-[280px]">
                      <p className="truncate" title={log.description}>{log.description}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                      {log.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">Page {page} of {meta.totalPages} · {meta.total} entries</p>
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
