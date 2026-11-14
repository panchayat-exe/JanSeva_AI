import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ImageIcon,
  Info,
  Loader2,
  AlertCircle,
  ShieldCheck,
  HourglassIcon,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import api, { SERVER_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface ComplaintMedia {
  id: string;
  url: string;
  role: string;
  originalName: string;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string } | null;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  newStatus?: string;
  previousStatus?: string;
  createdAt: string;
  actorName?: string;
}

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  status: string;
  category: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
  resolvedAt?: string;
  fieldOfficerVerifiedAt?: string;
  citizenVerification?: string;
  citizenVerifiedAt?: string;
  closedAt?: string;
  lastReopenedAt?: string;
  timeline?: TimelineEvent[];
  media?: ComplaintMedia[];
  officer?: { firstName: string; lastName: string } | null;
  aiSummary?: string | null;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, hh:mm a");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy");
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  return format(new Date(iso), "hh:mm a");
}

function mediaUrl(url: string) {
  return url.startsWith("/") ? `${SERVER_URL}${url}` : url;
}

// Map complaint status to pipeline step index (0-based)
function getCompletedSteps(status: string): number {
  switch (status) {
    case "ASSIGNED": return 1;
    case "IN_PROGRESS": return 3; // engineer reached + work in progress
    case "RESOLVED": return 4; // work completed
    case "AWAITING_CITIZEN_VERIFICATION": return 5; // field officer verified
    case "CLOSED": return 6; // all done
    case "REOPENED": return 5; // shown as not verified
    default: return 0;
  }
}

export function UpdateProgress() {
  const { id } = useParams({ from: "/complaints/$id/progress" });
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verified, setVerified] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/complaints/${id}`);
      const raw = response.data.data;
      setComplaint(raw?.id ? raw : raw?.data ?? raw);
    } catch {
      setLoadError("Failed to load complaint details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaint(); }, [id]);

  const handleVerifyWork = async () => {
    setVerifying(true);
    setVerifyError("");
    try {
      await api.post(`/complaints/${id}/field-officer-verify`);
      setVerified(true);
      await fetchComplaint();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to verify. Please try again.";
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleStartWork = async () => {
    setUpdating(true);
    setVerifyError("");
    try {
      await api.put(`/complaints/${id}/status`, { status: "IN_PROGRESS", note: "Engineer has reached location and started work." });
      await fetchComplaint();
    } catch (err: any) {
      setVerifyError(err?.response?.data?.message || "Failed to start work.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!beforeFile || !afterFile) {
      setVerifyError("Please upload both Before and After photos.");
      return;
    }
    setUpdating(true);
    setVerifyError("");
    try {
      const beforeData = new FormData();
      beforeData.append("file", beforeFile);
      beforeData.append("role", "BEFORE_REPAIR");
      await api.post(`/complaints/${id}/media`, beforeData, { headers: { "Content-Type": "multipart/form-data" } });

      const afterData = new FormData();
      afterData.append("file", afterFile);
      afterData.append("role", "AFTER_REPAIR");
      await api.post(`/complaints/${id}/media`, afterData, { headers: { "Content-Type": "multipart/form-data" } });

      await api.put(`/complaints/${id}/status`, { status: "RESOLVED", note: "Work has been completed and evidence uploaded." });
      await fetchComplaint();
    } catch (err: any) {
      setVerifyError(err?.response?.data?.message || "Failed to complete work.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppShell
        title="Complaint Progress"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Complaint Progress" },
        ]}
      >
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading complaint progress…</span>
        </div>
      </AppShell>
    );
  }

  if (loadError || !complaint) {
    return (
      <AppShell
        title="Complaint Progress"
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Complaints", to: "/complaints" },
          { label: "Complaint Progress" },
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
  const completedSteps = getCompletedSteps(status);

  // Find timeline events for each step
  const tl = complaint.timeline ?? [];
  const getEvent = (type: string) => tl.find((e) => e.newStatus === type || e.eventType === type);

  const assignedEvent = getEvent("ASSIGNED");
  const inProgressEvent = getEvent("IN_PROGRESS");
  const resolvedEvent = getEvent("RESOLVED");
  const officerVerifyEvent = tl.find(
    (e) => e.newStatus === "AWAITING_CITIZEN_VERIFICATION"
  );
  const closedEvent = getEvent("CLOSED");

  // Steps based on pipeline
  const steps = [
    {
      label: "Assigned",
      date: assignedEvent ? fmtDate(assignedEvent.createdAt) : (complaint.createdAt ? fmtDate(complaint.createdAt) : "—"),
      time: assignedEvent ? fmtTime(assignedEvent.createdAt) : "",
      done: completedSteps >= 1,
      icon: Check,
    },
    {
      label: "Engineer Reached Location",
      date: inProgressEvent ? fmtDate(inProgressEvent.createdAt) : "—",
      time: inProgressEvent ? fmtTime(inProgressEvent.createdAt) : "",
      done: completedSteps >= 2,
      icon: Check,
    },
    {
      label: "Work In Progress",
      date: inProgressEvent ? fmtDate(inProgressEvent.createdAt) : "—",
      time: inProgressEvent ? fmtTime(inProgressEvent.createdAt) : "",
      done: completedSteps >= 3,
      icon: Check,
    },
    {
      label: "Work Completed",
      date: resolvedEvent ? fmtDate(resolvedEvent.createdAt) : (complaint.resolvedAt ? fmtDate(complaint.resolvedAt) : "—"),
      time: resolvedEvent ? fmtTime(resolvedEvent.createdAt) : (complaint.resolvedAt ? fmtTime(complaint.resolvedAt) : ""),
      done: completedSteps >= 4,
      icon: Camera,
      isKeyStep: true,
    },
    {
      label: "Field Officer Verified",
      date: officerVerifyEvent ? fmtDate(officerVerifyEvent.createdAt) : (complaint.fieldOfficerVerifiedAt ? fmtDate(complaint.fieldOfficerVerifiedAt) : "—"),
      time: officerVerifyEvent ? fmtTime(officerVerifyEvent.createdAt) : (complaint.fieldOfficerVerifiedAt ? fmtTime(complaint.fieldOfficerVerifiedAt) : ""),
      done: completedSteps >= 5,
      icon: ShieldCheck,
    },
    {
      label: "Citizen Verified",
      date: closedEvent ? fmtDate(closedEvent.createdAt) : (complaint.citizenVerifiedAt ? fmtDate(complaint.citizenVerifiedAt) : "—"),
      time: closedEvent ? fmtTime(closedEvent.createdAt) : (complaint.citizenVerifiedAt ? fmtTime(complaint.citizenVerifiedAt) : ""),
      done: completedSteps >= 6,
      icon: CheckCircle2,
    },
  ];

  const beforePhoto = complaint.media?.find((m) => m.role === "BEFORE_REPAIR");
  const afterPhoto = complaint.media?.find((m) => m.role === "AFTER_REPAIR");

  const canVerify = ["RESOLVED", "IN_PROGRESS"].includes(status) && !verified;
  const isAwaiting = status === "AWAITING_CITIZEN_VERIFICATION";
  const isClosed = status === "CLOSED";
  const isReopened = status === "REOPENED";
  const citizenSaidYes = complaint.citizenVerification === "YES" || isClosed;
  const citizenSaidNo = complaint.citizenVerification === "NO" || isReopened;

  return (
    <AppShell
      title="Complaint Progress"
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Complaints", to: "/complaints" },
        { label: "Complaint Details", to: "/complaints/$id", params: { id } },
        { label: "Complaint Progress" },
      ]}
    >
      {/* Status banner */}
      <Panel className="p-6 lg:p-8">
        {(isClosed || (verified && citizenSaidYes)) ? (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-india-green">
              <Check className="h-7 w-7 text-india-green" />
            </span>
            <h2 className="mt-4 font-display text-2xl text-india-green">
              Complaint Closed — Verified by Citizen
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The citizen confirmed the problem has been resolved.
              {complaint.citizenVerifiedAt ? ` On ${fmt(complaint.citizenVerifiedAt)}.` : ""}
            </p>
          </div>
        ) : isReopened ? (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </span>
            <h2 className="mt-4 font-display text-2xl text-destructive">
              Complaint Reopened
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The citizen reported the problem was not resolved.
              {complaint.lastReopenedAt ? ` Reopened on ${fmt(complaint.lastReopenedAt)}.` : ""}
            </p>
          </div>
        ) : isAwaiting ? (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-saffron">
              <HourglassIcon className="h-7 w-7 text-saffron" />
            </span>
            <h2 className="mt-4 font-display text-2xl text-saffron">
              Awaiting Citizen Verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have verified the work. The complaint is now pending citizen confirmation.
              {complaint.fieldOfficerVerifiedAt ? ` Sent on ${fmt(complaint.fieldOfficerVerifiedAt)}.` : ""}
            </p>
          </div>
        ) : canVerify ? (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-india-green">
              <ShieldCheck className="h-7 w-7 text-india-green" />
            </span>
            <h2 className="mt-4 font-display text-2xl">
              Work Completed — Awaiting Your Verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The engineer has completed the work. Please verify and forward to the citizen.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-border">
              <ClipboardCheck className="h-7 w-7 text-muted-foreground" />
            </span>
            <h2 className="mt-4 font-display text-2xl">Complaint In Progress</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Current status: {status.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Pipeline */}
        <ol className="mt-10 grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.label} className="text-center">
                <span
                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                    s.done
                      ? "border-india-green text-india-green"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm">{s.label}</p>
                <p className={`mt-1 text-xs ${s.isKeyStep && s.done ? "text-india-green" : "text-muted-foreground"}`}>
                  {s.date}
                  {s.time && <><br />{s.time}</>}
                </p>
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* AI Summary */}
      {complaint.aiSummary && (
        <Panel className="mt-6 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Info className="h-4 w-4 text-primary" /> AI Assessment Summary
          </h2>
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
            {complaint.aiSummary}
          </div>
        </Panel>
      )}

      {/* Evidence panel */}
      {(beforePhoto || afterPhoto) && (
        <Panel className="mt-6 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <ImageIcon className="h-4 w-4 text-saffron" /> Evidence Uploaded by Engineer
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {[
              { label: "Before Photo", item: beforePhoto },
              { label: "After Photo", item: afterPhoto },
            ].map(({ label, item }) =>
              item ? (
                <figure key={label} className="rounded-xl border border-border bg-surface-2 p-4">
                  <figcaption className="text-sm">{label}</figcaption>
                  <img
                    src={mediaUrl(item.url)}
                    alt={`${label} — ${item.originalName}`}
                    className="mt-3 h-52 w-full rounded-lg object-cover bg-muted"
                    crossOrigin="anonymous"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {fmt(item.createdAt)}
                  </p>
                </figure>
              ) : null
            )}
          </div>

          {canVerify && (
            <div className="mt-6 flex gap-3 rounded-lg border border-india-green/30 bg-india-green/5 p-4 text-sm text-india-green">
              <Info className="h-5 w-5 shrink-0" />
              <p>
                The work has been marked as completed by the engineer. Please review the evidence above and verify the work to send to the citizen for final confirmation.
              </p>
            </div>
          )}

          {isAwaiting && (
            <div className="mt-6 flex gap-3 rounded-lg border border-saffron/30 bg-saffron/5 p-4 text-sm text-saffron">
              <Clock className="h-5 w-5 shrink-0" />
              <p>
                You have verified the work. The citizen will be asked to confirm whether the problem has been resolved.
              </p>
            </div>
          )}
        </Panel>
      )}

      {/* Action Panels for specific states */}
      {status === "ASSIGNED" && (
        <Panel className="mt-6 p-6">
          <h2 className="font-display text-lg">Start Resolution Work</h2>
          <p className="mt-2 text-sm text-muted-foreground">Mark that the engineer has reached the location and work is in progress.</p>
          <button
            onClick={handleStartWork}
            disabled={updating}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Mark Work In Progress
          </button>
        </Panel>
      )}

      {status === "IN_PROGRESS" && (
        <Panel className="mt-6 p-6">
          <h2 className="font-display text-lg">Complete Resolution Work</h2>
          <p className="mt-2 text-sm text-muted-foreground">Upload photographic evidence to mark the work as completed.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border bg-surface-2 p-4 text-sm">
              <label className="block font-medium mb-2">Before Repair Photo <span className="text-destructive">*</span></label>
              <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20" />
            </div>
            <div className="rounded-xl border bg-surface-2 p-4 text-sm">
              <label className="block font-medium mb-2">After Repair Photo <span className="text-destructive">*</span></label>
              <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20" />
            </div>
          </div>
          <button
            onClick={handleCompleteWork}
            disabled={updating || !beforeFile || !afterFile}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Upload & Mark Completed
          </button>
        </Panel>
      )}

      {isReopened && (
        <Panel className="mt-6 p-6">
          <h2 className="font-display text-lg">Restart Corrective Action</h2>
          <p className="mt-2 text-sm text-muted-foreground">The citizen was not satisfied. You must restart the resolution process.</p>
          <button
            onClick={handleStartWork}
            disabled={updating}
            className="mt-4 flex items-center gap-2 rounded-lg bg-destructive px-6 py-2.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            Restart Work (Mark In Progress)
          </button>
        </Panel>
      )}

      {/* Verify error */}
      {verifyError && (
        <Panel className="mt-4 flex items-center gap-3 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {verifyError}
        </Panel>
      )}

      {/* Citizen response panel (after verification) */}
      {(isClosed || isReopened) && (
        <Panel className="mt-6 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            Citizen Response
          </h2>
          <div className={`mt-4 flex gap-3 rounded-lg border p-4 text-sm ${
            citizenSaidYes
              ? "border-india-green/30 bg-india-green/5 text-india-green"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            {citizenSaidYes ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <p>
              {citizenSaidYes
                ? `Citizen confirmed the problem is resolved. Complaint closed on ${fmt(complaint.citizenVerifiedAt || complaint.closedAt)}.`
                : `Citizen reported the problem was NOT resolved. Complaint has been reopened.`}
            </p>
          </div>
        </Panel>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap justify-between gap-4">
        <Link
          to="/complaints/$id"
          params={{ id }}
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Complaint Details
        </Link>

        {canVerify && (
          <button
            onClick={handleVerifyWork}
            disabled={verifying}
            className="flex items-center gap-2 rounded-lg bg-india-green px-6 py-2.5 text-sm font-medium text-india-green-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {verifying ? "Verifying…" : "Verify Work & Send to Citizen"}
          </button>
        )}

        {isAwaiting && (
          <Link
            to="/complaints/$id/verification"
            params={{ id }}
            className="flex items-center gap-2 rounded-lg border border-saffron px-6 py-2.5 text-sm text-saffron hover:bg-saffron/10"
          >
            View Verification Status <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        {(isClosed || isReopened) && (
          <Link
            to="/complaints/$id/verification"
            params={{ id }}
            className="flex items-center gap-2 rounded-lg bg-india-green px-6 py-2.5 text-sm font-medium text-india-green-foreground transition-opacity hover:opacity-90"
          >
            View Verification Result <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </AppShell>
  );
}
