import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Copy,
  Droplets,
  HardHat,
  HelpCircle,
  Info,
  Lock,
  Loader2,
  MapPin,
  MoreVertical,
  Share2,
  AlertCircle,
  ListFilter,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { api, SERVER_URL } from "../lib/api";
import type { Complaint } from "../types/api";
import { Route } from "../routes/complaint";
import { useT } from "../lib/i18n";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  WATER_SUPPLY: Droplets,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComplaintDetails() {
  const t = useT();
  const { id } = Route.useSearch();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("No complaint ID provided.");
      setLoading(false);
      return;
    }
    api
      .get<{ data: Complaint | { data: Complaint } }>(`/complaints/${id}`)
      .then(({ data }) => {
        // Handle both { data: <complaint> } and { data: { data: <complaint> } }
        const raw = data.data as any;
        const complaint: Complaint = raw?.id ? raw : raw?.data ?? raw;
        setComplaint(complaint);
      })
      .catch(() => setError("Failed to load complaint details."))
      .finally(() => setLoading(false));
  }, [id]);

  const copyId = () => {
    if (complaint?.complaintNumber) {
      navigator.clipboard.writeText(complaint.complaintNumber).catch(() => {});
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title={t.complaint.title} back="/complaints" />
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">{t.common.loading}</span>
        </div>
      </AppShell>
    );
  }

  if (error || !complaint) {
    return (
      <AppShell>
        <PageHeader title={t.complaint.title} back="/complaints" />
        <div className="flex items-center gap-3 rounded-xl border border-border px-5 py-5 text-sm text-destructive">
          <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
          {error || t.complaint.notFound}
        </div>
      </AppShell>
    );
  }

  const Icon = CATEGORY_ICONS[complaint.category] ?? ListFilter;
  const latestTimeline = complaint.timeline?.[complaint.timeline.length - 1];

  return (
    <AppShell>
      <PageHeader
        title={t.complaint.title}
        back="/complaints"
        action={
          <div className="flex items-center gap-3 text-muted-foreground">
            <HelpCircle className="h-6 w-6" strokeWidth={1.5} />
            <button onClick={() => navigator.share?.({ title: complaint.title, url: window.location.href }).catch(() => {})}>
              <Share2 className="h-6 w-6" strokeWidth={1.5} />
            </button>
            <MoreVertical className="h-6 w-6" strokeWidth={1.5} />
          </div>
        }
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {/* Header card */}
        <section className="gov-panel flex flex-col gap-6 px-5 py-6 md:flex-row">
          <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-border">
            <Icon className="h-14 w-14" strokeWidth={1.25} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl">{complaint.title}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              {t.complaint.complaintId}: {complaint.complaintNumber}
              <button onClick={copyId} aria-label="Copy ID">
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
              {formatDate(complaint.createdAt)}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" strokeWidth={1.5} /> {complaint.address}, {complaint.city}, {complaint.state} {complaint.pincode ? `- ${complaint.pincode}` : ''}
            </p>
          </div>
          <div className="w-full md:w-72">
            <span className="inline-block rounded-md border border-saffron px-3 py-1 text-sm text-saffron">
              {(complaint.status ?? "").replace(/_/g, " ") || "—"}
            </span>
            <p className="mt-3 text-sm">{complaint.progress}{t.complaint.progress}</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full border border-border">
              <div className="h-full rounded-full bg-saffron" style={{ width: `${complaint.progress}%` }} />
            </div>
            {complaint.estimatedResolution && (
              <>
                <p className="mt-3 text-sm text-muted-foreground">{t.complaint.estResolution}</p>
                <p className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" strokeWidth={1.5} />
                  {formatDate(complaint.estimatedResolution)}
                </p>
              </>
            )}
          </div>
        </section>

        {/* AI Summary */}
        {complaint.aiSummary && (
          <section className="gov-panel px-5 py-6">
            <h3 className="font-display text-lg">{t.complaint.aiAnalysis}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{complaint.aiSummary}</p>
          </section>
        )}

        {/* Latest update from timeline */}
        {latestTimeline && (
          <section className="gov-panel px-5 py-6">
            <h3 className="font-display text-lg">{t.complaint.latestUpdate}</h3>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border">
                <HardHat className="h-10 w-10" strokeWidth={1.25} />
              </span>
              <div className="flex-1">
                <p className="text-sm">{latestTimeline.description}</p>
                {latestTimeline.createdBy && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    by {latestTimeline.createdBy.firstName} {latestTimeline.createdBy.lastName} (
                    {latestTimeline.createdBy.role})
                  </p>
                )}
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
                  {formatDate(latestTimeline.createdAt)}
                </p>
              </div>
              <span className="rounded-lg border border-border px-4 py-2 text-sm">
                {(latestTimeline.status ?? "").replace(/_/g, " ") || "—"}
              </span>
            </div>
          </section>
        )}

        {/* Media / Evidence */}
        <section className="gov-panel px-5 py-6">
          <h3 className="font-display text-lg">{t.complaint.evidence}</h3>
          {complaint.media && complaint.media.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {complaint.media.map((m) => {
                const src = m.url.startsWith("/") ? `${SERVER_URL}${m.url}` : m.url;
                return (
                  <a
                    key={m.id}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={src}
                      alt={m.fileName}
                      crossOrigin="anonymous"
                      className="w-full rounded-xl border border-border object-cover aspect-video hover:opacity-90 transition-opacity bg-muted"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const placeholder = document.createElement("div");
                        placeholder.className = "flex w-full aspect-video items-center justify-center rounded-xl border border-border bg-muted text-xs text-muted-foreground break-all p-2 text-center";
                        placeholder.textContent = m.fileName || "Unknown file";
                        el.parentElement?.appendChild(placeholder);
                      }}
                    />
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-border">
                <Lock className="h-6 w-6" strokeWidth={1.25} />
              </span>
              <p className="text-sm text-muted-foreground">{t.complaint.noEvidence}</p>
            </div>
          )}
        </section>

        {/* Verification section */}
        <section className="gov-panel flex flex-col gap-5 px-5 py-6 md:flex-row md:items-center">
          <Info className="h-10 w-10 shrink-0" strokeWidth={1.25} />
          <div className="flex-1">
            <p className="font-display text-base">{t.complaint.verificationTitle}</p>
            <p className="text-sm text-muted-foreground">{t.complaint.verificationDesc}</p>
          </div>
          <div className="text-center">
            {complaint.status === "AWAITING_CITIZEN_VERIFICATION" ? (
              <Link
                to="/verify"
                search={{ id: complaint.id }}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t.complaint.verifyBtn}
              </Link>
            ) : (
              <span className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-6 py-3 text-sm text-muted-foreground opacity-60">
                <Lock className="h-4 w-4" strokeWidth={1.5} /> {t.complaint.verifyBtn}
              </span>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {complaint.status === "AWAITING_CITIZEN_VERIFICATION" 
                ? "Your verification is required now." 
                : t.complaint.verifyNote}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
