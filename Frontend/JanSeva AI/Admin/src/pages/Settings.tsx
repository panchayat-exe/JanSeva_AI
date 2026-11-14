import { Bell, ChevronRight, Globe, Info, LogOut, Moon, Shield, Trash2, Settings2, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { auth } from "@/lib/auth";
import api from "@/lib/api";
import { toast } from "sonner";

interface SystemSettings {
  siteName: string;
  defaultSlaHours: number;
  escalationThresholdHours: number;
  maxReopenCount: number;
  autoAssignEnabled: boolean;
  maintenanceMode: boolean;
}

export function Settings() {
  const { dark, toggle } = useDark();
  const { isSuperAdmin } = useAuth();
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/admin/settings")
      .then(({ data: r }) => setSysSettings(r.data))
      .catch(() => {});
  }, [isSuperAdmin]);

  const saveSysSettings = async () => {
    if (!sysSettings) return;
    setSaving(true);
    try {
      await api.put("/admin/settings", sysSettings);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { icon: Shield, title: "Privacy & Security", desc: "Manage your privacy settings and data security." },
    { icon: Info,   title: "About JANSEVA AI",   desc: "Learn more about the platform, version and policies." },
  ];

  return (
    <AppShell title="Settings" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]}>
      <div className="space-y-4">
        {/* Dark Mode */}
        <Panel className="flex items-center gap-5 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ashoka/40 bg-ashoka/10">
            <Moon className="h-5 w-5 text-ashoka" />
          </span>
          <div className="flex-1">
            <p className="text-base">Dark Mode</p>
            <p className="mt-1 text-sm text-muted-foreground">Enable or disable dark mode for the application.</p>
          </div>
          <button
            role="switch"
            aria-checked={dark}
            aria-label="Toggle dark mode"
            onClick={toggle}
            className={`h-6 w-11 rounded-full p-0.5 transition-colors ${dark ? "bg-ashoka" : "bg-muted"}`}
          >
            <span className={`block h-5 w-5 rounded-full bg-foreground transition-transform ${dark ? "translate-x-5" : ""}`} />
          </button>
        </Panel>

        {/* Language */}
        <Panel className="flex items-center gap-5 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-saffron/40 bg-saffron/10">
            <Globe className="h-5 w-5 text-saffron" />
          </span>
          <div className="flex-1">
            <p className="text-base">Language</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose your preferred language.</p>
          </div>
          <select className="h-10 rounded-lg border border-input bg-surface-2 px-3 text-sm outline-none focus:border-ashoka">
            <option>English</option>
            <option>हिन्दी</option>
            <option>मराठी</option>
            <option>বাংলা</option>
          </select>
        </Panel>

        {rows.map(({ icon: Icon, title, desc }) => (
          <Panel key={title} className="flex items-center gap-5 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ashoka/40 bg-ashoka/10">
              <Icon className="h-5 w-5 text-ashoka" />
            </span>
            <div className="flex-1">
              <p className="text-base">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Panel>
        ))}

        {/* System Settings (Super Admin only) */}
        {isSuperAdmin && sysSettings && (
          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ashoka/40 bg-ashoka/10">
                <Settings2 className="h-5 w-5 text-ashoka" />
              </span>
              <div>
                <p className="text-base">System Configuration</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Configure platform-wide settings (Super Admin only)</p>
              </div>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Default SLA (hours)</label>
                  <input
                    type="number" min={1}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                    value={sysSettings.defaultSlaHours}
                    onChange={(e) => setSysSettings({ ...sysSettings, defaultSlaHours: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Escalation Threshold (hours)</label>
                  <input
                    type="number" min={1}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                    value={sysSettings.escalationThresholdHours}
                    onChange={(e) => setSysSettings({ ...sysSettings, escalationThresholdHours: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Max Reopen Count</label>
                  <input
                    type="number" min={0}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ashoka"
                    value={sysSettings.maxReopenCount}
                    onChange={(e) => setSysSettings({ ...sysSettings, maxReopenCount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox" className="rounded"
                    checked={sysSettings.autoAssignEnabled}
                    onChange={(e) => setSysSettings({ ...sysSettings, autoAssignEnabled: e.target.checked })}
                  />
                  Auto-Assign Complaints
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox" className="rounded"
                    checked={sysSettings.maintenanceMode}
                    onChange={(e) => setSysSettings({ ...sysSettings, maintenanceMode: e.target.checked })}
                  />
                  Maintenance Mode
                </label>
              </div>
              <div className="pt-2">
                <button
                  onClick={saveSysSettings}
                  disabled={saving}
                  className="rounded-lg bg-ashoka px-5 py-2.5 text-sm font-medium text-white hover:bg-ashoka/90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save System Settings"}
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Logout */}
        <Panel className="flex items-center gap-5 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </span>
          <div className="flex-1">
            <p className="text-base">Logout</p>
            <p className="mt-1 text-sm text-muted-foreground">Sign out from your account.</p>
          </div>
          <button
            onClick={() => auth.logout()}
            className="flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </Panel>
      </div>
    </AppShell>
  );
}

// Simple dark mode hook — reads from document class
function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };
  return { dark, toggle };
}
