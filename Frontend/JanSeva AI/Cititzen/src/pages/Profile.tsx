import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck, CalendarDays, CheckCircle2, Clock,
  FileText, IdCard, LogOut, Mail, RefreshCw, UserRound, ShieldAlert, Edit2, X, Save, Phone
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "../lib/auth";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { toast } from "sonner";

interface DashboardStats {
  total: number;
  resolved: number;
  inProgress: number;
  reopened: number;
}

interface FullProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  citizenId: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  stats: DashboardStats;
}

export function ProfilePage() {
  const { user: authUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);

  // OTP State
  const [otpModal, setOtpModal] = useState<{ isOpen: boolean; type: 'EMAIL' | 'PHONE'; code: string; isVerifying: boolean }>({
    isOpen: false,
    type: 'EMAIL',
    code: '',
    isVerifying: false
  });
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    api
      .get<{ data: FullProfile }>("/users/profile")
      .then(({ data }) => {
        setProfile(data.data);
        setEditForm({
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          phone: data.data.phone || "",
        });
      })
      .catch(() => {});
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/" });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await api.put<{ data: any }>("/users/profile", editForm);
      setProfile((prev) => prev ? { ...prev, ...res.data.data } : null);
      
      // Update auth context so the new name reflects immediately across the app
      if (refreshUser) {
        await refreshUser();
      }
      
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendOtp = async (type: 'EMAIL' | 'PHONE') => {
    if (type === 'PHONE' && (!profile?.phone || profile.phone.trim() === '')) {
      toast.error('Please add your phone number first by clicking Edit');
      return;
    }

    try {
      setIsSendingOtp(true);
      await api.post('/auth/send-otp', { type });
      toast.success(
        type === 'EMAIL'
          ? 'A 6-digit code has been sent to your email inbox'
          : 'A 6-digit OTP has been sent to your phone via SMS'
      );
      setOtpModal({ isOpen: true, type, code: '', isVerifying: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send verification code';
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpModal.code.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setOtpModal(prev => ({ ...prev, isVerifying: true }));
      await api.post("/auth/verify-otp", { 
        type: otpModal.type, 
        code: otpModal.code 
      });
      toast.success(
        otpModal.type === 'EMAIL' 
          ? '✅ Email verified successfully!' 
          : '✅ Phone verified successfully!'
      );
      setOtpModal({ isOpen: false, type: 'EMAIL', code: '', isVerifying: false });
      // Refresh both profile data and auth context
      fetchProfile();
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Incorrect or expired code. Please try again.");
      setOtpModal(prev => ({ ...prev, isVerifying: false, code: '' }));
    }
  };

  // We use profile data if available, fallback to authUser
  const displayUser = profile || authUser;

  const info = [
    { icon: Mail,        label: t.profile.emailLabel,   value: displayUser?.email ?? "—", isVerified: displayUser?.isEmailVerified, type: 'EMAIL' as const, showVerify: true },
    { icon: Phone,       label: "Phone Number",         value: profile?.phone || "—", isVerified: profile?.isPhoneVerified, type: 'PHONE' as const, showVerify: true },
    { icon: IdCard,      label: t.profile.citizenId,    value: displayUser?.citizenId || (displayUser?.id ? displayUser.id.slice(0, 8).toUpperCase() : "—") },
    {
      icon: CalendarDays,
      label: t.profile.registeredOn,
      value: profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
        : "—",
    },
  ];

  const resolved   = profile?.stats?.resolved ?? 0;
  const inProgress = profile?.stats?.inProgress ?? 0;
  const reopened   = profile?.stats?.reopened ?? 0;
  const total      = profile?.stats?.total ?? 0;

  const summary = [
    { icon: FileText,    value: String(total),      label: t.profile.totalComplaints },
    { icon: CheckCircle2,value: String(resolved),   label: t.profile.resolved },
    { icon: Clock,       value: String(inProgress), label: t.profile.inProgress },
    { icon: RefreshCw,   value: String(reopened),   label: t.profile.reopened },
  ];
  
  const isFullyVerified = displayUser?.isEmailVerified && profile?.isPhoneVerified;

  return (
    <AppShell>
      <PageHeader title={t.profile.title} back="/dashboard" />

      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <section className="gov-panel flex flex-col items-center gap-6 px-6 py-8 md:flex-row">
          <span className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-border">
            <UserRound className="h-16 w-16" strokeWidth={1.1} />
            {isFullyVerified ? (
              <BadgeCheck
                className="absolute -bottom-1 -right-1 h-9 w-9 bg-card text-india-green"
                strokeWidth={1.25}
              />
            ) : (
              <ShieldAlert
                className="absolute -bottom-1 -right-1 h-9 w-9 bg-card text-amber-500"
                strokeWidth={1.25}
              />
            )}
          </span>
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-xl">
              {displayUser ? `${displayUser.firstName} ${displayUser.lastName}` : "Citizen"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFullyVerified ? t.profile.verifiedDesc : t.profile.unverifiedDesc}
            </p>
          </div>
          <span className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm ${isFullyVerified ? "border-india-green text-india-green" : "border-amber-500 text-amber-600 dark:text-amber-400"}`}>
            {isFullyVerified ? (
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
            )}
            {isFullyVerified ? t.profile.verified : t.profile.unverified}
          </span>
        </section>

        <section className="gov-panel px-6 py-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{t.profile.accountInfo}</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm font-medium text-saffron hover:underline"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    firstName: profile?.firstName || "",
                    lastName: profile?.lastName || "",
                    phone: profile?.phone || "",
                  });
                }}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">First Name</label>
                  <input 
                    type="text" 
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Last Name</label>
                  <input 
                    type="text" 
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <input 
                  type="text" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email (Cannot be changed)</label>
                <input 
                  type="email" 
                  disabled
                  value={displayUser?.email || ""}
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-70 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Citizen ID (Cannot be changed)</label>
                <input 
                  type="text" 
                  disabled
                  value={displayUser?.citizenId || (displayUser?.id ? displayUser.id.slice(0, 8).toUpperCase() : "")}
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-70 cursor-not-allowed"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-saffron px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E57A00] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {info.map(({ icon: Icon, label, value, isVerified, type, showVerify }) => (
                <div key={label} className="flex items-center gap-4 py-4">
                  <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-base">{value}</p>
                      {showVerify && isVerified && (
                        <BadgeCheck className="h-4 w-4 text-india-green" />
                      )}
                    </div>
                  </div>
                  {showVerify && !isVerified && (
                    <button
                      onClick={() => handleSendOtp(type)}
                      disabled={isSendingOtp}
                      className="rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
                    >
                      Verify
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="gov-panel px-6 py-6">
          <h3 className="font-display text-lg">{t.profile.complaintSummary}</h3>
          <div className="mt-5 grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-border">
            {summary.map(({ icon: Icon, value, label }) => (
              <div key={label} className="px-2 text-center md:px-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border">
                    <Icon className="h-6 w-6" strokeWidth={1.25} />
                  </span>
                  <span className="font-display text-3xl">{value}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="gov-panel flex items-center gap-4 px-6 py-5 transition-colors hover:bg-secondary text-destructive w-full text-left"
        >
          <LogOut className="h-7 w-7" strokeWidth={1.25} />
          <span className="font-display text-base">{t.profile.logout}</span>
        </button>
      </div>

      {otpModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Verify {otpModal.type === 'EMAIL' ? 'Email' : 'Phone'}</h3>
              <button 
                onClick={() => setOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 hover:bg-secondary"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a 6-digit code to your {otpModal.type === 'EMAIL' ? 'email address' : 'phone number'}.
            </p>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpModal.code}
                onChange={(e) => setOtpModal(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                placeholder="000000"
                autoFocus
                className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={otpModal.code.length !== 6 || otpModal.isVerifying}
                className="w-full rounded-lg bg-saffron py-3 font-medium text-white transition-colors hover:bg-[#E57A00] disabled:opacity-50"
              >
                {otpModal.isVerifying ? "Verifying..." : "Verify Code"}
              </button>
              <button
                onClick={() => handleSendOtp(otpModal.type)}
                disabled={isSendingOtp}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50"
              >
                {isSendingOtp ? 'Sending...' : "Didn't receive it? Resend code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

