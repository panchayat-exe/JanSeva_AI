import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ClipboardCheck, HelpCircle, Info, Loader2, Lock, Mic } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { api, getErrorMessage } from "../lib/api";
import { Route } from "../routes/reopen";
import { useT, useI18n } from "../lib/i18n";
import { transliterate, isRomanizedHindi } from "../lib/transliterate";

export function ReopenPage() {
  const { id } = Route.useSearch();
  const t = useT();
  const { lang } = useI18n();
  const reasons = t.reopen.reasons as readonly string[];
  const [selected, setSelected] = useState(reasons[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    if (!id) { setError(t.reopen.errorNoId); return; }
    setLoading(true);
    try {
      await api.post(`/complaints/${id}/reopen`, {
        reason: selected,
        additionalNote: note.trim() || undefined,
      });
      navigate({ to: "/complaints" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (e: { results: { transcript: string }[][] }) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      setNote((prev) => prev ? prev + " " + transcript : transcript);
    };
    recognition.start();
  };

  return (
    <AppShell>
      <PageHeader
        title={t.reopen.title}
        back="/verify"
        action={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-6 w-6" strokeWidth={1.5} /> {t.common.help}
          </span>
        }
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <section className="gov-panel flex flex-col gap-5 px-5 py-6 md:flex-row md:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border">
            <AlertCircle className="h-8 w-8 text-saffron" strokeWidth={1.25} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg">{t.reopen.heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.reopen.subheading}</p>
            <p className="text-sm text-muted-foreground">{t.reopen.subheading2}</p>
          </div>
          <ClipboardCheck className="hidden h-16 w-16 text-muted-foreground md:block" strokeWidth={1} />
        </section>

        <section className="gov-panel px-5 py-6">
          <h3 className="font-display text-lg">{t.reopen.whatIssue}</h3>
          <div className="mt-4 flex flex-col gap-3">
            {reasons.map((reason) => (
              <label
                key={reason}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 text-sm transition-colors ${
                  selected === reason ? "border-saffron" : "border-border hover:bg-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  className="sr-only"
                  checked={selected === reason}
                  onChange={() => setSelected(reason)}
                />
                <span
                  className={`h-5 w-5 rounded-full border ${
                    selected === reason ? "border-saffron bg-saffron" : "border-border"
                  }`}
                />
                {reason}
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border px-4 py-2">
            <input
              placeholder={t.reopen.notePlaceholder}
              value={note}
              lang={lang === "hi" ? "hi" : "en"}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => {
                if (lang === "hi" && isRomanizedHindi(note)) setNote(transliterate(note));
              }}
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="h-6 w-px bg-border" />
            <button type="button" onClick={handleMic} className="flex items-center gap-2 text-sm">
              <Mic className="h-5 w-5" strokeWidth={1.5} /> {t.common.speak}
            </button>
          </div>
        </section>

        <section className="gov-panel flex gap-4 px-5 py-6">
          <Info className="h-9 w-9 shrink-0" strokeWidth={1.25} />
          <div>
            <p className="font-display text-base">{t.reopen.nextTitle}</p>
            <p className="text-sm text-muted-foreground">{t.reopen.nextDesc1}</p>
            <p className="text-sm text-muted-foreground">{t.reopen.nextDesc2}</p>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="gov-panel py-4 text-center font-display text-base transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.reopen.submitting}
            </span>
          ) : t.reopen.submitBtn}
        </button>

        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" strokeWidth={1.5} /> {t.reopen.reopenedNote}
        </p>
      </div>
    </AppShell>
  );
}
