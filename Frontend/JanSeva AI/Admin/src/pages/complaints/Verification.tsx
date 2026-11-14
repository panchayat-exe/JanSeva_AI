import { Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  HourglassIcon,
  Info,
  Loader2,
  MessageSquare,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import api from "@/lib/api";
import { format } from "date-fns";

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  category: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  citizenVerification?: string;
  citizenVerificationReason?: string;
  citizenVerifiedAt?: string;
  fieldOfficerVerifiedAt?: string;
  closedAt?: string;
  lastReopenedAt?: string;
  lastReopenReason?: string;
  resolvedAt?: string;
  createdAt: string;
  citizen?: { firstName: string; lastName: string } | null;
  officer?: { firstName: string; lastName: string } | null;
  department?: { name: string } | null;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, hh:mm a");
}

function Row({ icon: Icon, label, value, tone = "" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${tone}`}>{value}</span>
    </div>
  );
}

export function Verification() {
  const { id } = useParams({ from: "/complaints/$id/verification" });
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!id) { setLoadError("No complaint ID."); setLoading(false); return; }
    api.get(`/complaints/${id}`)
      .then(({ data }) => {
        const raw = data.data as any;
        setComplaint(raw?.id ? raw : raw?.data ?? raw);
      })
      .catch(() => setLoadError("Failed to load complaint details."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell
        title="Citizen Verification"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Verification Status" },
        ]}
      >
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading verification status…</span>
        </div>
      </AppShell>
    );
  }

  if (loadError || !complaint) {
    return (
      <AppShell
        title="Citizen Verification"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Verification Status" },
        ]}
      >
        <Panel className="flex items-center gap-3 p-6 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {loadError || "Complaint not found."}
        </Panel>
      </AppShell>
    );
  }

  const status = complaint.status;
  const citizenVerification = complaint.citizenVerification;
  const isClosed = status === "CLOSED" || citizenVerification === "YES";
  const isReopened = status === "REOPENED" || citizenVerification === "NO";
  const isAwaiting = status === "AWAITING_CITIZEN_VERIFICATION" && !citizenVerification;

  const categoryLabel = (complaint.category ?? "").replace(/_/g, " ");
  const location = [complaint.address, complaint.city, complaint.state].filter(Boolean).join(", ") || "—";

  return (
    <AppShell
      title="Citizen Verification"
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Complaints", to: "/complaints" },
        { label: "Complaint Details", to: "/complaints/$id", params: { id } },
        { label: "Verification Status" },
      ]}
    >
      {/* ── AWAITING: Citizen has not yet responded ── */}
      {isAwaiting && (
        <>
          <Panel className="p-6 lg:p-8">
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-saffron">
                <HourglassIcon className="h-7 w-7 text-saffron" />
              </span>
              <div>
                <h2 className="font-display text-xl text-saffron">Awaiting Citizen Verification</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The citizen has been notified and has not yet responded.
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Complaint ID", complaint.complaintNumber],
                ["Category", categoryLabel],
                ["Location", location],
                ["Officer Verified On", fmt(complaint.fieldOfficerVerifiedAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-1.5 text-sm font-medium">{v}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="mt-6 flex gap-4 border-saffron/30 bg-saffron/5 p-6">
            <Info className="h-6 w-6 shrink-0 text-saffron" />
            <div className="text-sm">
              <p className="text-saffron">The complaint is pending citizen response.</p>
              <p className="mt-1 text-muted-foreground">
                Once the citizen responds, this page will update automatically.
              </p>
            </div>
          </Panel>
        </>
      )}

      {/* ── CLOSED: Citizen said YES ── */}
      {isClosed && (
        <>
          <Panel className="p-6 lg:p-8">
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-india-green">
                <Check className="h-7 w-7 text-india-green" />
              </span>
              <div>
                <h2 className="font-display text-xl text-india-green">Verified by Citizen — Problem Solved</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The citizen confirmed the issue has been resolved.
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Complaint ID", complaint.complaintNumber],
                ["Category", categoryLabel],
                ["Location", location],
                ["Verified On", fmt(complaint.citizenVerifiedAt || complaint.closedAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-1.5 text-sm font-medium">{v}</p>
                </div>
              ))}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Citizen Response</p>
                <p className="mt-1.5 text-sm font-semibold text-india-green">YES — Problem Solved</p>
              </div>
            </div>
          </Panel>

          <Panel className="mt-6 flex gap-4 border-india-green/30 bg-india-green/5 p-6">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-india-green" />
            <div className="text-sm">
              <p className="text-india-green">Citizen has verified the complaint as YES — Problem Solved.</p>
              <p className="mt-1 text-muted-foreground">This complaint is now closed.</p>
            </div>
          </Panel>
        </>
      )}

      {/* ── REOPENED: Citizen said NO ── */}
      {isReopened && (
        <Panel className="p-6 lg:p-10">
          <div className="text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive">
              <X className="h-8 w-8 text-destructive" />
            </span>
            <h2 className="mt-5 font-display text-3xl">
              Complaint <span className="text-destructive">Not Verified</span>
            </h2>
            <div className="mx-auto mt-4 h-px w-16 bg-destructive/60" />
            <p className="mt-5 text-sm text-muted-foreground">
              The citizen has not accepted the resolution.
              <br />
              The complaint has been reopened.
            </p>
          </div>

          <div className="mt-8 divide-y divide-border/60">
            <Row
              icon={MessageSquare}
              label="Response"
              value="NO — Problem Not Solved"
              tone="text-destructive"
            />
            <Row
              icon={AlertCircle}
              label="Reason"
              value={complaint.citizenVerificationReason || complaint.lastReopenReason || "No reason provided"}
            />
            <Row
              icon={Calendar}
              label="Submitted On"
              value={fmt(complaint.citizenVerifiedAt || complaint.lastReopenedAt)}
            />
            <Row
              icon={RefreshCw}
              label="Action Required"
              value="Complaint Reopened — Re-assign & Resolve"
              tone="text-destructive"
            />
            <Row
              icon={Clock}
              label="Original Resolution"
              value={fmt(complaint.resolvedAt)}
            />
          </div>
        </Panel>
      )}

      {/* ── Fallback: status not yet at verification stage ── */}
      {!isClosed && !isReopened && !isAwaiting && (
        <Panel className="p-6 lg:p-8">
          <div className="flex items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border">
              <Info className="h-7 w-7 text-muted-foreground" />
            </span>
            <div>
              <h2 className="font-display text-xl">Verification Not Yet Started</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current status: <span className="font-medium">{status.replace(/_/g, " ")}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The Field Officer must verify the work before it is sent to the citizen for verification.
              </p>
            </div>
          </div>
        </Panel>
      )}

      <Link
        to="/complaints/$id"
        params={{ id }}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Complaint Details
      </Link>
    </AppShell>
  );
}
