import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  HelpCircle,
  ImageIcon,
  Info,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Route } from "../routes/verify";
import { api, getErrorMessage, SERVER_URL } from "../lib/api";
import { useEffect, useState } from "react";

interface ComplaintMedia {
  id: string;
  url: string;
  role: string;
  originalName: string;
  createdAt: string;
}

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  category: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  fieldOfficerVerifiedAt?: string;
  citizenVerification?: string;
  citizenVerifiedAt?: string;
  citizenVerificationReason?: string;
  closedAt?: string;
  resolvedAt?: string;
  media?: ComplaintMedia[];
  officer?: { firstName: string; lastName: string } | null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function mediaUrl(url: string) {
  return url.startsWith("/") ? `${SERVER_URL}${url}` : url;
}

export function VerifyPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setLoadError("No complaint ID provided."); setLoading(false); return; }
    api.get(`/complaints/${id}`)
      .then(({ data }) => {
        const raw = data.data as any;
        setComplaint(raw?.id ? raw : raw?.data ?? raw);
      })
      .catch(() => setLoadError("Failed to load complaint details."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleVerify = async (satisfied: boolean) => {
    if (!id) { navigate({ to: "/thank-you" }); return; }
    setVerifying(true);
    setError("");
    try {
      await api.post(`/complaints/${id}/verify`, { isSatisfied: satisfied });
      navigate({ to: "/thank-you" });
    } catch (err) {
      setError(getErrorMessage(err));
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Resolution Verification" back="/complaint" />
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading complaint details…</span>
        </div>
      </AppShell>
    );
  }

  if (loadError || !complaint) {
    return (
      <AppShell>
        <PageHeader title="Resolution Verification" back="/complaint" />
        <div className="flex items-center gap-3 rounded-xl border border-border px-5 py-5 text-sm text-destructive">
          <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
          {loadError || "Complaint not found."}
        </div>
      </AppShell>
    );
  }

  const beforePhoto = complaint.media?.find((m) => m.role === "BEFORE_REPAIR");
  const afterPhoto = complaint.media?.find((m) => m.role === "AFTER_REPAIR");
  const officerName = complaint.officer
    ? `${complaint.officer.firstName} ${complaint.officer.lastName}`
    : "Field Officer";

  const copyId = () => navigator.clipboard.writeText(complaint.complaintNumber).catch(() => {});

  // Already responded YES — show read-only result
  if (complaint.citizenVerification === "YES" || complaint.status === "CLOSED") {
    return (
      <AppShell>
        <PageHeader title="Resolution Verification" back="/complaint"
          action={<span className="flex items-center gap-2 text-sm text-muted-foreground"><HelpCircle className="h-6 w-6" strokeWidth={1.5} /> Help</span>} />
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <section className="gov-panel flex flex-col gap-6 px-5 py-6 md:flex-row md:items-center">
            <CheckCircle2 className="h-16 w-16 shrink-0 text-india-green" strokeWidth={1.25} />
            <div>
              <h2 className="font-display text-xl text-india-green">Verified — Problem Solved</h2>
              <p className="mt-1 text-sm text-muted-foreground">You confirmed this complaint as resolved.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Verified on: {formatDate(complaint.citizenVerifiedAt || complaint.closedAt)}
              </p>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  // Already responded NO — show read-only result
  if (complaint.citizenVerification === "NO" || complaint.status === "REOPENED") {
    return (
      <AppShell>
        <PageHeader title="Resolution Verification" back="/complaint"
          action={<span className="flex items-center gap-2 text-sm text-muted-foreground"><HelpCircle className="h-6 w-6" strokeWidth={1.5} /> Help</span>} />
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <section className="gov-panel flex flex-col gap-6 px-5 py-6 md:flex-row md:items-center">
            <XCircle className="h-16 w-16 shrink-0 text-destructive" strokeWidth={1.25} />
            <div>
              <h2 className="font-display text-xl text-destructive">Complaint Reopened</h2>
              <p className="mt-1 text-sm text-muted-foreground">You reported the problem was not resolved.</p>
              {complaint.citizenVerificationReason && (
                <p className="mt-1 text-sm">Reason: {complaint.citizenVerificationReason}</p>
              )}
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  // Awaiting verification (status = AWAITING_CITIZEN_VERIFICATION) — show action form
  return (
    <AppShell>
      <PageHeader
        title="Resolution Verification"
        back="/complaint"
        action={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-6 w-6" strokeWidth={1.5} /> Help
          </span>
        }
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {/* Complaint header */}
        <section className="gov-panel flex flex-col gap-6 px-5 py-6 md:flex-row md:items-center">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border">
            <CheckCircle2 className="h-10 w-10 text-india-green" strokeWidth={1.25} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-xl">Work Completed</h2>
            <p className="text-sm text-muted-foreground">{complaint.category?.replace(/_/g, " ")}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              Complaint ID: {complaint.complaintNumber}
              <button onClick={copyId} aria-label="Copy ID">
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </p>
            {complaint.address && (
              <p className="mt-1 text-sm text-muted-foreground">
                {complaint.address}
                {complaint.city ? `, ${complaint.city}` : ""}
                {complaint.state ? `, ${complaint.state}` : ""}
              </p>
            )}
          </div>
          <div className="space-y-3 md:border-l md:border-border md:pl-6">
            {complaint.fieldOfficerVerifiedAt && (
              <p className="flex items-center gap-3 text-sm">
                <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
                <span>
                  Verified by Officer
                  <span className="block text-muted-foreground">
                    {formatDate(complaint.fieldOfficerVerifiedAt)}
                  </span>
                </span>
              </p>
            )}
            {(complaint.resolvedAt || complaint.fieldOfficerVerifiedAt) && (
              <p className="flex items-center gap-3 text-sm">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
                <span>
                  Work completed
                  <span className="block text-muted-foreground">
                    {formatDate(complaint.resolvedAt || complaint.fieldOfficerVerifiedAt)}
                  </span>
                </span>
              </p>
            )}
          </div>
        </section>

        {/* Before/After photos */}
        {(beforePhoto || afterPhoto) && (
          <section className="gov-panel px-5 py-6">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-7 w-7" strokeWidth={1.25} />
              <div>
                <h3 className="font-display text-lg">Work Evidence</h3>
                <p className="text-sm text-muted-foreground">Uploaded by {officerName}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {beforePhoto && (
                <figure>
                  <figcaption className="mb-2 text-sm text-muted-foreground">Before Repair</figcaption>
                  <img
                    src={mediaUrl(beforePhoto.url)}
                    alt="Before repair"
                    className="w-full rounded-xl border border-border object-cover aspect-video bg-muted"
                    crossOrigin="anonymous"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(beforePhoto.createdAt)}</p>
                </figure>
              )}
              {afterPhoto && (
                <figure>
                  <figcaption className="mb-2 text-sm text-muted-foreground">After Repair</figcaption>
                  <img
                    src={mediaUrl(afterPhoto.url)}
                    alt="After repair"
                    className="w-full rounded-xl border border-border object-cover aspect-video bg-muted"
                    crossOrigin="anonymous"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(afterPhoto.createdAt)}</p>
                </figure>
              )}
            </div>
          </section>
        )}

        {/* Action section */}
        <section className="gov-panel px-5 py-6 text-center">
          <h3 className="font-display text-lg">Is your problem solved?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your response will close or reopen this complaint.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <button
                type="button"
                onClick={() => handleVerify(true)}
                disabled={verifying}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-india-green px-6 py-4 text-sm text-india-green transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {verifying ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                )}
                Yes, Problem Solved
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Confirm and close complaint</p>
            </div>
            <div>
              <Link
                to="/reopen"
                search={{ id: id ?? undefined }}
                className="flex items-center justify-center gap-3 rounded-lg border border-border px-6 py-4 text-sm transition-colors hover:bg-secondary"
              >
                <XCircle className="h-5 w-5" strokeWidth={1.5} /> No, Problem Not Solved
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">Provide details to reopen complaint</p>
            </div>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" strokeWidth={1.5} /> Your feedback helps us improve public services.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
