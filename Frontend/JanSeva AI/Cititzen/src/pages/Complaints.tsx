import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays, ChevronRight, Droplets, Headphones,
  Lamp, ListFilter, MapPin, MessageSquare, Search, Trash,
  AlertCircle, Loader2,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { api } from "../lib/api";
import type { ComplaintListItem, ComplaintStatus } from "../types/api";
import { useT } from "../lib/i18n";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  WATER_SUPPLY: Droplets,
  SANITATION: Trash,
  STREET_LIGHTS: Lamp,
  ELECTRICITY: Lamp,
};

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  SUBMITTED:    "text-muted-foreground border-border",
  UNDER_REVIEW: "text-muted-foreground border-border",
  ASSIGNED:     "text-muted-foreground border-border",
  IN_PROGRESS:  "text-saffron border-saffron",
  RESOLVED:     "text-india-green border-india-green",
  CLOSED:       "text-india-green border-india-green",
  REJECTED:     "text-destructive border-destructive",
  REOPENED:     "text-saffron border-saffron",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const t = useT();

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: { items?: ComplaintListItem[]; } | ComplaintListItem[] }>("/complaints", { params: { limit: 20 } })
      .then(({ data }) => {
        // Handle both { data: { items: [] } } and { data: [] } shapes
        const raw = data.data;
        const list: ComplaintListItem[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.items)
          ? (raw as any).items
          : [];
        setComplaints(list);
      })
      .catch(() => setError(t.complaints.errorLoad))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.complaintNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader title={t.complaints.title} back="/dashboard" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col pb-4 sm:pb-0">
        <h2 className="font-display text-xl">{t.complaints.heading}</h2>
        <p className="text-sm text-muted-foreground">{t.complaints.subheading}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-border px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <input
              placeholder={t.complaints.searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
          >
            <ListFilter className="h-5 w-5" strokeWidth={1.5} /> {t.complaints.filterBtn}
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">{t.common.loading}</span>
            </div>
          )}

          {/* Empty / Error Fallback */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center sm:py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm">
                <ListFilter className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="px-4">
                <h3 className="font-display text-lg sm:text-xl">{t.complaints.empty}</h3>
                <p className="mt-2 text-sm text-muted-foreground sm:max-w-sm">
                  Once you report an issue in your city, it will appear here so you can easily track its progress and resolution.
                </p>
              </div>
              <Link
                to="/report"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-saffron px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-saffron/90"
              >
                {t.complaints.reportFirst}
              </Link>
            </div>
          )}

          {/* Complaint cards */}
          {!loading && !error &&
            filtered.map((c) => {
              const Icon = CATEGORY_ICONS[c.category] ?? ListFilter;
              const tone = STATUS_STYLE[c.status] ?? "text-muted-foreground border-border";
              return (
                <Link
                  key={c.id}
                  to="/complaint"
                  search={{ id: c.id }}
                  className="gov-panel flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-secondary md:flex-row md:items-center"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border">
                    <Icon className="h-8 w-8" strokeWidth={1.25} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg">{c.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.complaint.complaintId}: {c.complaintNumber}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
                      {formatDate(c.createdAt)}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" strokeWidth={1.5} /> {c.address}, {c.city}
                    </p>
                  </div>

                  <div className="w-full md:w-64">
                    <span className={`inline-block rounded-md border px-3 py-1 text-xs ${tone}`}>
                      {t.complaints.status[c.status]}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.complaints.updatedAt} {formatDate(c.updatedAt)}
                    </p>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-border">
                      <div className="h-full rounded-full bg-foreground/80" style={{ width: `${c.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{c.progress}{t.complaints.complete}</p>
                  </div>

                  <ChevronRight className="hidden h-6 w-6 text-muted-foreground md:block" strokeWidth={1.5} />
                </Link>
              );
            })}
        </div>

        <div className="gov-panel mt-6 mb-4 flex flex-col items-center justify-between gap-4 px-5 py-4 sm:flex-row">
          <div className="flex w-full items-center gap-4 text-left sm:w-auto">
            <Headphones className="h-7 w-7 shrink-0 text-muted-foreground" strokeWidth={1.25} />
            <div>
              <p className="font-display text-sm sm:text-base">{t.complaints.helpTitle}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{t.complaints.helpDesc}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary sm:w-auto"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> {t.complaints.getHelp}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
