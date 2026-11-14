import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  User,
  UserCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { format } from "date-fns";

const fieldCls =
  "h-11 w-full rounded-lg border border-input bg-surface-2 px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ashoka transition-colors";

interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  department?: { id: string; name: string } | null;
  _count?: { assignedComplaints: number };
}

interface Department {
  id: string;
  name: string;
}

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
  department?: { id: string; name: string } | null;
  officer?: { firstName: string; lastName: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600 bg-red-50 border-red-200",
  HIGH: "text-orange-600 bg-orange-50 border-orange-200",
  MEDIUM: "text-yellow-600 bg-yellow-50 border-yellow-200",
  LOW: "text-green-600 bg-green-50 border-green-200",
};

function fmtCat(raw: string) {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AssignOfficer() {
  const { id } = useParams({ from: "/complaints/$id/assign" });
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState("");

  // form state
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [officerSearch, setOfficerSearch] = useState("");
  const [officerDropOpen, setOfficerDropOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOfficerDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, oRes, dRes] = await Promise.all([
          api.get(`/complaints/${id}`),
          api.get("/admin/officers"),
          api.get("/admin/departments").catch(() => ({ data: { data: [] } })),
        ]);
        const raw = cRes.data.data;
        setComplaint(raw?.id ? raw : raw?.data ?? raw);
        setOfficers(oRes.data.data ?? []);
        setDepartments(dRes.data.data ?? []);
      } catch {
        setLoadError("Failed to load complaint or officer data.");
      } finally {
        setLoadingPage(false);
      }
    };
    load();
  }, [id]);

  const filteredOfficers = officers.filter((o) => {
    const q = officerSearch.toLowerCase();
    return (
      o.firstName.toLowerCase().includes(q) ||
      o.lastName.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.department?.name ?? "").toLowerCase().includes(q)
    );
  });

  const handleOfficerSelect = (o: Officer) => {
    setSelectedOfficer(o);
    setOfficerSearch(`${o.firstName} ${o.lastName}`);
    setOfficerDropOpen(false);
    // pre-fill department if officer has one
    if (o.department?.id && !departmentId) setDepartmentId(o.department.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer) {
      setSubmitError("Please select an officer to assign.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const body: {
        officerId: string;
        departmentId?: string;
        priority?: string;
        estimatedResolutionAt?: string;
        note?: string;
      } = { officerId: selectedOfficer.id };
      if (departmentId) body.departmentId = departmentId;
      if (priority) body.priority = priority;
      if (estimatedDate) body.estimatedResolutionAt = new Date(estimatedDate).toISOString();
      if (note.trim()) body.note = note.trim();

      await api.post(`/complaints/${id}/assign`, body);
      setSubmitSuccess(true);

      // Navigate to complaint details after 1.5s
      setTimeout(() => {
        navigate({ to: "/complaints/$id", params: { id } });
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to assign complaint. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPage) {
    return (
      <AppShell
        title="Assign Complaint"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Assign Complaint" },
        ]}
      >
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell
        title="Assign Complaint"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Assign Complaint" },
        ]}
      >
        <Panel className="flex items-center gap-3 p-6 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {loadError}
        </Panel>
      </AppShell>
    );
  }

  if (submitSuccess) {
    return (
      <AppShell
        title="Assign Complaint"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Assign Complaint" },
        ]}
      >
        <Panel className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-india-green bg-india-green/10">
            <Check className="h-8 w-8 text-india-green" />
          </span>
          <h2 className="font-display text-xl text-india-green">Complaint Assigned Successfully</h2>
          <p className="text-sm text-muted-foreground">
            Assigned to <span className="font-medium text-foreground">{selectedOfficer?.firstName} {selectedOfficer?.lastName}</span>.
            Redirecting to complaint details…
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Assign Complaint"
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Complaints", to: "/complaints" },
        { label: "Complaint Details", to: "/complaints/$id", params: { id } },
        { label: "Assign Complaint" },
      ]}
    >
      {/* Complaint Summary */}
      {complaint && (
        <Panel className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <FileText className="h-4 w-4 text-saffron" /> Complaint Summary
          </h2>
          <div className="mt-5 grid gap-5 border-b border-border/60 pb-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Complaint ID", complaint.complaintNumber || complaint.id],
              ["Category", fmtCat(complaint.category)],
              ["Location", [complaint.city, complaint.state].filter(Boolean).join(", ") || complaint.address || "—"],
              ["Priority", complaint.priority],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="mt-1.5 text-sm font-medium">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
              <span className={`mt-1.5 inline-block rounded-full border px-2.5 py-1 text-xs ${PRIORITY_COLORS[complaint.priority] ?? ""}`}>
                {complaint.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          {complaint.title && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Title</p>
              <p className="mt-1 text-sm font-medium">{complaint.title}</p>
            </div>
          )}
          {complaint.description && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{complaint.description}</p>
            </div>
          )}
          {complaint.department && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              AI-recommended department: <span className="font-medium text-foreground">{complaint.department.name}</span>
            </div>
          )}
          {complaint.address && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {complaint.address}
            </div>
          )}
        </Panel>
      )}

      {/* Assignment Form */}
      <Panel className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <UserCircle2 className="h-5 w-5 text-ashoka" /> Assign Field Officer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a field officer to handle this complaint. They will be notified immediately.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-5">
          {/* Officer Selector */}
          <div>
            <label className="text-sm font-medium" htmlFor="officer-search">
              Field Officer <span className="text-destructive">*</span>
            </label>
            <div className="relative mt-2" ref={dropRef}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="officer-search"
                  value={officerSearch}
                  onChange={(e) => {
                    setOfficerSearch(e.target.value);
                    setSelectedOfficer(null);
                    setOfficerDropOpen(true);
                  }}
                  onFocus={() => setOfficerDropOpen(true)}
                  placeholder="Search officers by name, email, department…"
                  className={`${fieldCls} pl-9 pr-10`}
                  autoComplete="off"
                />
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform ${officerDropOpen ? "rotate-180" : ""}`}
                />
              </div>
              {officerDropOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredOfficers.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">No officers found</p>
                  ) : (
                    filteredOfficers.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleOfficerSelect(o)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent ${selectedOfficer?.id === o.id ? "bg-ashoka/10" : ""}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{o.firstName} {o.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{o.email}</p>
                          {o.department && (
                            <p className="text-xs text-ashoka truncate">{o.department.name}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                          {o._count?.assignedComplaints ?? 0} active
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedOfficer && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-india-green/30 bg-india-green/5 px-3 py-2 text-sm text-india-green">
                <Check className="h-4 w-4 shrink-0" />
                <span>
                  <span className="font-medium">{selectedOfficer.firstName} {selectedOfficer.lastName}</span> selected
                  {selectedOfficer.department ? ` · ${selectedOfficer.department.name}` : ""}
                </span>
              </div>
            )}
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div>
              <label className="text-sm font-medium" htmlFor="dept-select">
                Department (Optional)
              </label>
              <div className="relative mt-2">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="dept-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={`${fieldCls} pl-9 appearance-none`}
                >
                  <option value="">Select a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Priority Override */}
          <div>
            <label className="text-sm font-medium" htmlFor="priority-select">
              Priority Override (Optional)
            </label>
            <div className="relative mt-2">
              <select
                id="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`${fieldCls} appearance-none`}
              >
                <option value="">Keep current priority ({complaint?.priority ?? "—"})</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Estimated Date */}
          <div>
            <label className="text-sm font-medium" htmlFor="est-date">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Expected Resolution Date (Optional)
              </span>
            </label>
            <input
              id="est-date"
              type="date"
              value={estimatedDate}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setEstimatedDate(e.target.value)}
              className={`mt-2 ${fieldCls}`}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium" htmlFor="assign-note">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Note for Officer (Optional)
              </span>
            </label>
            <textarea
              id="assign-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Add any special instructions or context for the officer…"
              className="mt-2 w-full rounded-lg border border-input bg-surface-2 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ashoka transition-colors resize-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/1000</p>
          </div>

          {/* Info Banner */}
          <div className="flex gap-4 rounded-lg border border-ashoka/30 bg-ashoka/5 p-4 text-sm">
            <Info className="h-5 w-5 shrink-0 text-ashoka mt-0.5" />
            <p className="text-muted-foreground">
              After assigning, the complaint status will be updated to{" "}
              <span className="font-medium text-foreground">Assigned</span> and the selected officer
              will be notified immediately.
            </p>
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
            <Link
              to="/complaints/$id"
              params={{ id }}
              className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Complaint Details
            </Link>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/complaints"
                className="rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedOfficer}
                className="flex items-center gap-2 rounded-lg bg-saffron px-6 py-2.5 text-sm font-medium text-saffron-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCircle2 className="h-4 w-4" />
                )}
                {submitting ? "Assigning…" : "Assign Complaint"}
              </button>
            </div>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
