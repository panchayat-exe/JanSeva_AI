import { useEffect, useState } from "react";
import {
  UserCheck, Search, Users2, FileText, Clock, Mail,
  CheckCircle2, XCircle, Building2,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface Officer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  department?: { id: string; name: string };
  _count: { assignedComplaints: number };
}

export function Officers() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get("/admin/departments").then(({ data: r }) => setDepartments(r.data ?? [])).catch(() => {});
    loadOfficers();
  }, []);

  const loadOfficers = (s = search, d = departmentId) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (s) params['search'] = s;
    if (d) params['departmentId'] = d;
    api.get("/admin/officers", { params })
      .then(({ data: r }) => setOfficers(r.data ?? []))
      .catch(() => toast.error("Failed to load officers"))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => loadOfficers(search, departmentId);

  const toggleActive = async (officer: Officer) => {
    try {
      await api.put(`/admin/users/${officer.id}`, { isActive: !officer.isActive });
      toast.success(`Officer ${officer.isActive ? "deactivated" : "activated"}`);
      loadOfficers();
    } catch {
      toast.error("Failed to update officer status");
    }
  };

  const selectCls = "h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka";

  return (
    <AppShell title="Officers" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Officers" }]}>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-56 rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ashoka"
            placeholder="Search officers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); loadOfficers(search, e.target.value); }} className={selectCls}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={handleSearch} className="rounded-lg bg-ashoka px-4 py-2 text-sm text-white hover:bg-ashoka/90">
          Search
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Officers</p>
          <p className="mt-1 font-display text-3xl">{officers.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Active</p>
          <p className="mt-1 font-display text-3xl text-india-green">{officers.filter((o) => o.isActive).length}</p>
        </Panel>
        <Panel className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Assigned Cases</p>
          <p className="mt-1 font-display text-3xl">{officers.reduce((s, o) => s + o._count.assignedComplaints, 0)}</p>
        </Panel>
      </div>

      {/* Table */}
      {loading ? (
        <Panel className="p-8 text-center text-muted-foreground">Loading officers...</Panel>
      ) : officers.length === 0 ? (
        <Panel className="p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-display text-lg">No officers found</p>
          <p className="mt-1 text-sm text-muted-foreground">Add officers via User Management and assign them the Officer role.</p>
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Officer", "Department", "Email", "Assigned Cases", "Last Login", "Status", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officers.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ashoka/10 text-xs font-bold text-ashoka">
                          {o.firstName[0]}{o.lastName[0]}
                        </div>
                        <span className="font-medium">{o.firstName} {o.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {o.department ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> {o.department.name}
                        </span>
                      ) : <span className="text-warning">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <a href={`mailto:${o.email}`} className="flex items-center gap-1.5 hover:text-ashoka">
                        <Mail className="h-3.5 w-3.5" /> {o.email}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 font-medium ${o._count.assignedComplaints > 10 ? "text-destructive" : o._count.assignedComplaints > 5 ? "text-warning" : "text-india-green"}`}>
                        <FileText className="h-3.5 w-3.5" /> {o._count.assignedComplaints}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {o.lastLoginAt ? format(new Date(o.lastLoginAt), "dd MMM yyyy") : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.isActive ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
                        {o.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleActive(o)}
                        title={o.isActive ? "Deactivate" : "Activate"}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${o.isActive ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"}`}
                      >
                        {o.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
