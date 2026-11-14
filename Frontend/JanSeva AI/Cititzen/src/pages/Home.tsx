import { Link } from "@tanstack/react-router";
import { ClipboardList, Info, Mic, ArrowRight, Lock, Sun, CloudSun, Moon, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "../lib/auth";
import { useT, useI18n } from "../lib/i18n";

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const hour = new Date(istString).getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

const GREETING_META = {
  goodMorning:   { Icon: Sun,      color: "text-amber-500"  },
  goodAfternoon: { Icon: CloudSun, color: "text-orange-500" },
  goodEvening:   { Icon: Moon,     color: "text-indigo-400" },
};

export function Home() {
  const { user } = useAuth();
  const t = useT();
  const { lang } = useI18n();
  const key = getGreetingKey();
  const { Icon: GreetingIcon, color: greetingColor } = GREETING_META[key];
  const greeting = t.home[key];
  const name = user ? `${user.firstName}!` : (lang === "hi" ? "मित्र!" : "there!");

  return (
    <AppShell>
      {/* Greeting — flush to the main's left padding edge */}
      <div className="mb-6 flex items-center gap-3 sm:gap-4 sm:mb-8">
        <span className={`shrink-0 ${greetingColor}`}>
          <GreetingIcon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
        </span>
        <h1 className="font-display text-xl font-semibold sm:text-2xl lg:text-3xl">
          {greeting}, {name}
        </h1>
      </div>

      {/* Centered content column */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold sm:text-2xl lg:text-3xl">
            {t.home.whatToDo}
          </h2>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full tricolour-rule" />
          <p className="mt-3 text-sm text-muted-foreground">{t.home.makeCity}</p>
        </div>

        {/* Action cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="gov-panel flex flex-col items-center px-5 py-7 sm:py-9">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border sm:h-24 sm:w-24">
              <Mic className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.25} />
            </span>
            <h3 className="mt-4 font-display text-lg sm:mt-5 sm:text-xl">{t.home.reportTitle}</h3>
            <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
              {t.home.reportDesc}
            </p>
            <Link
              to="/report"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary sm:mt-5"
            >
              {t.home.reportBtn} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </article>

          <article className="gov-panel flex flex-col items-center px-5 py-7 sm:py-9">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border sm:h-24 sm:w-24">
              <ClipboardList className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.25} />
            </span>
            <h3 className="mt-4 font-display text-lg sm:mt-5 sm:text-xl">{t.home.complaintsTitle}</h3>
            <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
              {t.home.complaintsDesc}
            </p>
            <Link
              to="/complaints"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary sm:mt-5"
            >
              {t.home.complaintsBtn} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </article>
        </div>

        {/* Info banner */}
        <Link 
          to="/settings"
          className="gov-panel mt-4 flex items-center justify-between gap-4 px-5 py-4 text-left sm:mt-5 transition-colors hover:bg-secondary cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Info className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" strokeWidth={1.25} />
            <div>
              <p className="font-display text-sm sm:text-base">{t.home.infoTitle}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{t.home.infoDesc}</p>
            </div>
          </div>
          <ChevronRight className="hidden h-5 w-5 text-muted-foreground sm:block shrink-0" strokeWidth={1.5} />
        </Link>

        {/* Footer */}
        <footer className="mt-auto flex flex-col items-center gap-2 border-t border-border px-1 pt-4 pb-2 text-xs text-muted-foreground sm:grid sm:grid-cols-3 sm:gap-3 sm:px-5">
          <span className="flex items-center justify-center gap-2 sm:justify-start">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> {t.home.footerSecure}
          </span>
          <span className="text-center">{t.home.footerRights}</span>
          <span className="flex justify-center gap-3 sm:justify-end">
            <span className="underline">{t.home.footerPrivacy}</span>
            <span className="underline">{t.home.footerTerms}</span>
          </span>
        </footer>
      </div>
    </AppShell>
  );
}
