import {
  ChevronRight, Globe, HelpCircle, LogOut,
  MessageSquare, Bell, Phone, ShieldCheck, Smartphone, Sun,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useT } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SettingsPage() {
  const t = useT();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <PageHeader title={t.settings.title} />

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {/* Language row — interactive */}
        <div className="gov-panel flex items-center gap-5 px-6 py-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border">
            <Globe className="h-6 w-6" strokeWidth={1.25} />
          </span>
          <span className="flex-1">
            <span className="block font-display text-base">{t.settings.language}</span>
            <span className="block text-sm text-muted-foreground">{t.settings.languageDesc}</span>
          </span>
          <LanguageSwitcher />
        </div>

        {/* Theme row — interactive */}
        <div className="gov-panel flex items-center gap-5 px-6 py-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border">
            <Sun className="h-6 w-6" strokeWidth={1.25} />
          </span>
          <span className="flex-1">
            <span className="block font-display text-base">{t.settings.theme}</span>
            <span className="block text-sm text-muted-foreground">{t.settings.themeDesc}</span>
          </span>
          <ThemeToggle />
        </div>

        <SettingRow
          icon={Bell}
          title={t.settings.notifications}
          description={t.settings.notificationsDesc}
          trailing={
            <span className="flex items-center gap-4 text-muted-foreground">
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
              <Phone className="h-5 w-5" strokeWidth={1.5} />
              <Smartphone className="h-5 w-5" strokeWidth={1.5} />
            </span>
          }
        />
        <SettingRow icon={ShieldCheck} title={t.settings.privacy} description={t.settings.privacyDesc} />
        <SettingRow icon={HelpCircle} title={t.settings.help} description={t.settings.helpDesc} />

        <button
          type="button"
          onClick={handleLogout}
          className="gov-panel flex items-center gap-5 px-6 py-5 text-left transition-colors hover:bg-secondary text-destructive"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-border">
            <LogOut className="h-6 w-6" strokeWidth={1.25} />
          </span>
          <span className="flex-1">
            <span className="block font-display text-base">{t.settings.logout}</span>
            <span className="block text-sm text-muted-foreground">{t.settings.logoutDesc}</span>
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </button>

        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> {t.common.secure}
        </p>
      </div>
    </AppShell>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  trailing,
}: {
  icon: typeof Globe;
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="gov-panel flex items-center gap-5 px-6 py-5 text-left transition-colors hover:bg-secondary"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border">
        <Icon className="h-6 w-6" strokeWidth={1.25} />
      </span>
      <span className="flex-1">
        <span className="block font-display text-base">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      {trailing}
      <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
    </button>
  );
}
