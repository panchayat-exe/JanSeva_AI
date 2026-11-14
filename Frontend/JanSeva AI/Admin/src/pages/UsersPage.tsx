import { useEffect, useState } from "react";
import {
  Users, Search, ChevronLeft, ChevronRight, Mail,
  Shield, CheckCircle2, XCircle, UserCog,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/useAuth";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  citizenId?: string;
  createdAt: string;
  lastLoginAt?: string;
  department?: { name: string };
}

const ROLE_OPTIONS = ["CITIZEN", "OFFICER", "DEPT_ADMIN", "SUPER_ADMIN"];
const ROLE_LABELS: Record<string, string> = {
  CITIZEN: "Citizen",
  OFFICER: "Field Officer",
  DEPT_ADMIN: "Dept Admin",
  SUPER_ADMIN: "Super Admin",
};
const ROLE_BADGE: Record<string, string> = {
  CITIZEN: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  OFFICER: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  DEPT_ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (p = page, s = search, r = roleFilter) => {
    setLoading(true);
    const params: Record<string, any> = { page: p, limit: 20 };
    if (s) params['search'] = s;
    if (r) params['role'] = r;
    api.get("/admin/users", { params })
      .then(({ data: res }) => {
        setUsers(res.data ?? []);
        setMeta(res.meta ?? { total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false });
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => { setPage(1); load(1, search, roleFilter); };

  const saveRole = async () => {
    if (!editUser || !newRole) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${editUser.id}`, { role: newRole });
      toast.success("User role updated");
      setEditUser(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.put(`/admin/users/${user.id}`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
      load();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const selectCls = "h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka";

  return (
    <AppShell title="User Management" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Users" }]}>
      {/* Edit role modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Panel className="w-full max-w-sm p-6">
            <h2 className="font-display text-lg mb-4">Change Role</h2>
            <p className="text-sm text-muted-foreground mb-4">
              User: <strong>{editUser.firstName} {editUser.lastName}</strong> ({editUser.email})
            </p>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={`${selectCls} w-full mb-4`}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={saveRole} disabled={saving}
                className="flex-1 rounded-lg bg-ashoka py-2.5 text-sm font-medium text-white hover:bg-ashoka/90 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-accent">
                Cancel
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-56 rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ashoka"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); load(1, search, e.target.value); }} className={selectCls}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button onClick={handleSearch} className="rounded-lg bg-ashoka px-4 py-2 text-sm text-white hover:bg-ashoka/90">
          Search
        </button>
      </div>

      <Panel className="mb-4 p-4 flex gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {meta.total} users total</span>
      </Panel>

      {/* Table */}
      {loading ? (
        <Panel className="p-8 text-center text-muted-foreground">Loading users...</Panel>
      ) : users.length === 0 ? (
        <Panel className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-display text-lg">No users found</p>
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["User", "Email", "Role", "Department", "Status", "Joined", isSuperAdmin ? "Actions" : ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ashoka/10 text-xs font-bold text-ashoka">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">{u.firstName} {u.lastName}</p>
                          {u.citizenId && <p className="text-xs text-muted-foreground">{u.citizenId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {u.email}</span>
                      {u.isEmailVerified && <span className="mt-0.5 flex items-center gap-1 text-[10px] text-india-green"><CheckCircle2 className="h-3 w-3" /> Verified</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE[u.role] ?? ""}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{u.department?.name ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format(new Date(u.createdAt), "dd MMM yyyy")}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditUser(u); setNewRole(u.role); }}
                            title="Change role"
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            title={u.isActive ? "Deactivate" : "Activate"}
                            className={`rounded-lg border p-1.5 ${u.isActive ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"}`}
                          >
                            {u.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {meta.totalPages} · {meta.total} users
              </p>
              <div className="flex gap-2">
                <button
                  disabled={!meta.hasPrevPage}
                  onClick={() => { const p = page - 1; setPage(p); load(p); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={!meta.hasNextPage}
                  onClick={() => { const p = page + 1; setPage(p); load(p); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40"
                >
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
