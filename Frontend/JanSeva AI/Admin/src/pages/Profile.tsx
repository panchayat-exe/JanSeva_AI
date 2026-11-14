import { BadgeCheck, Calendar, Camera, MapPin, Mail, Pencil, Phone, User, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";

export function Profile() {
  const { user, fullName, role } = useAuth();

  const getDesignation = () => {
    if (role === "SUPER_ADMIN") return "System Administrator";
    if (role === "DEPT_ADMIN") return "Department Administrator";
    if (role === "OFFICER") return "Field Officer";
    return "User";
  };

  const getDepartment = () => {
    if (role === "SUPER_ADMIN") return "JanSeva HQ";
    // In a real app we would map departmentId to name via API or Context
    if (user?.departmentId) return "Government Department"; 
    return "N/A";
  };

  const info: [string, string][] = [
    ["Full Name", fullName || "N/A"],
    ["Designation", getDesignation()],
    ["Department", getDepartment()],
    ["Official Email", user?.email || "N/A"],
    ["Phone Number", "Not Provided"],
  ];

  const posting: [string, string][] = [
    ["Office Address", "Registered Address"],
    ["User ID", user?.id || "N/A"],
    ["Role", role || "N/A"],
    ["Assigned Area", role === "SUPER_ADMIN" ? "All India" : "Local Ward"],
  ];

  return (
    <AppShell title="My Profile" crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Profile" }]}>
      <Panel className="p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto]">
          <div className="relative w-fit">
            <UserCircle2 className="h-28 w-28 text-muted-foreground" strokeWidth={0.9} />
            <button className="absolute bottom-1 right-1 rounded-full border border-ashoka bg-card p-2 text-ashoka">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h2 className="font-display text-2xl">{fullName}</h2>
            <p className="mt-1 text-sm text-ashoka">{getDesignation()}</p>
            <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4" /> {user?.email}
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4" /> Not Provided
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-4 w-4" /> Registered Address
              </p>
            </div>
          </div>
          <div className="space-y-5 border-t border-border/60 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {[
              { icon: Calendar, k: "Join Date", v: "Recently" },
              { icon: BadgeCheck, k: "Account Status", v: user?.isEmailVerified ? "Verified" : "Pending" },
              { icon: User, k: "Role Level", v: role },
            ].map(({ icon: Icon, k, v }) => (
              <div key={k} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-saffron" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-1 text-sm">{v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <User className="h-4 w-4 text-ashoka" /> Account Information
          </h2>
          <button
            onClick={() => toast("Profile editing is disabled in this demo.")}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Profile
          </button>
        </div>
        <div className="mt-6 grid gap-x-12 md:grid-cols-2">
          {[info, posting].map((group, gi) => (
            <dl key={gi} className="divide-y divide-border/60">
              {group.map(([k, v]) => (
                <div key={k} className="flex gap-3 py-3 text-sm">
                  <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                  <span className="text-muted-foreground/60">:</span>
                  <dd className="truncate" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </Panel>

    </AppShell>
  );
}
