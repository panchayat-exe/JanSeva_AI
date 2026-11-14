import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useT } from "../lib/i18n";

export function ThankYouPage() {
  const [rating, setRating] = useState(0);
  const t = useT();

  return (
    <AppShell>
      <div className="gov-panel mx-auto max-w-4xl px-6 py-14 text-center">
        <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-india-green">
          <Check className="h-14 w-14 text-india-green" strokeWidth={2} />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold">{t.thankYou.heading}</h1>
        <div className="mx-auto mt-4 h-0.5 w-28 bg-india-green" />
        <p className="mt-6 text-muted-foreground">Your complaint has been submitted successfully.</p>

        <Link
          to="/dashboard"
          className="mt-10 inline-block rounded-lg border border-border px-8 py-3 text-sm transition-colors hover:bg-secondary"
        >
          {t.thankYou.backHome}
        </Link>
      </div>
    </AppShell>
  );
}
