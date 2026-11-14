import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2, Plus, Search, ChevronRight,
  Users, FileText, Mail, Phone, CheckCircle2, XCircle,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headEmail?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  _count: { complaints: number; users: number };
}

export function Departments() {
  const { isSuperAdmin } = useAuth();
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", headEmail: "", phone: "" });

  const load = () => {
    setLoading(true);
    api.get("/admin/departments")
      .then(({ data: r }) => setDepts(r.data ?? []))
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = depts.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }
    setCreating(true);
    try {
      await api.post("/admin/departments", form);
      toast.success("Department created successfully");
      setShowCreate(false);
      setForm({ name: "", code: "", description: "", headEmail: "", phone: "" });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create department");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell title="Departments" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Departments" }]}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-64 rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ashoka"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-ashoka px-4 py-2.5 text-sm font-medium text-white hover:bg-ashoka/90"
          >
            <Plus className="h-4 w-4" /> New Department
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Panel className="w-full max-w-lg p-6">
            <h2 className="font-display text-xl mb-5">Create Department</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Municipal Corporation" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Code * (uppercase, max 20)</label>
                <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                  value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MUN-CORP" required maxLength={20} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ashoka resize-none"
                  rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Head Email</label>
                  <input type="email" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                    value={form.headEmail} onChange={(e) => setForm({ ...form, headEmail: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Phone</label>
                  <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-lg bg-ashoka py-2.5 text-sm font-medium text-white hover:bg-ashoka/90 disabled:opacity-60">
                  {creating ? "Creating..." : "Create Department"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-accent">
                  Cancel
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Departments</p>
          <p className="mt-1 font-display text-3xl">{depts.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Active</p>
          <p className="mt-1 font-display text-3xl text-india-green">{depts.filter((d) => d.isActive).length}</p>
        </Panel>
        <Panel className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Officers</p>
          <p className="mt-1 font-display text-3xl">{depts.reduce((s, d) => s + d._count.users, 0)}</p>
        </Panel>
      </div>

      {/* Department list */}
      {loading ? (
        <Panel className="p-8 text-center text-muted-foreground">Loading departments...</Panel>
      ) : filtered.length === 0 ? (
        <Panel className="p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-display text-lg">{search ? "No departments match your search" : "No departments found"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? "Create a department to get started." : "Contact the system administrator."}
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((dept) => (
            <Panel key={dept.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ashoka/10">
                    <Building2 className="h-5 w-5 text-ashoka" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-foreground">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground">{dept.code}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${dept.isActive ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-100 text-red-700"}`}>
                  {dept.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {dept.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{dept.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {dept._count.users} Officers
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {dept._count.complaints} Complaints
                </span>
                {dept.headEmail && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {dept.headEmail}
                  </span>
                )}
                {dept.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {dept.phone}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                <Link
                  to="/complaints"
                  search={{ departmentId: dept.id } as any}
                  className="text-sm text-ashoka hover:opacity-80 flex items-center gap-1"
                >
                  View complaints <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/officers"
                  search={{ departmentId: dept.id } as any}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View officers <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
