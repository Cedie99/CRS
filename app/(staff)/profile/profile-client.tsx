"use client";

import { useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { sileo as toast } from "sileo";
import {
  Camera,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  KeyRound,
  AtSign,
  Hash,
  Fingerprint,
  Pencil,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProfileClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    agentCode: string | null;
    avatarUrl: string | null;
    managerName: string | null;
  };
}

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB

async function readApiPayload(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  const text = await res.text();
  return { error: text || `Request failed (${res.status})` };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();

  // ── Avatar ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarPending, startAvatarTransition] = useTransition();

  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_SIZE) {
      toast.error({ title: "File must be under 2MB" });
      e.target.value = "";
      return;
    }

    startAvatarTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await readApiPayload(res);
      if (!res.ok) {
        toast.error({
          title:
            (data as { error?: string } | null)?.error ??
            (res.status === 413
              ? "Image is too large. Please upload a file under 2MB."
              : "Failed to upload avatar"),
        });
        return;
      }
      const avatar = (data as { avatarUrl?: string } | null)?.avatarUrl;
      if (!avatar) {
        toast.error({ title: "Upload succeeded but no avatar URL was returned" });
        return;
      }

      setAvatarUrl(avatar);
      await updateSession({ avatarUrl: avatar });
      router.refresh();
      toast.success({ title: "Avatar updated" });
    });
    e.target.value = "";
  }

  function handleRemoveAvatar() {
    startAvatarTransition(async () => {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        toast.error({ title: "Failed to remove avatar" });
        return;
      }
      setAvatarUrl(null);
      await updateSession({ avatarUrl: null });
      router.refresh();
      toast.success({ title: "Avatar removed" });
    });
  }

  // ── Profile settings ────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    fullName: user.fullName,
    email: user.email,
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profilePending, startProfileTransition] = useTransition();

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileErrors({});
    const trimmed = {
      fullName: profileData.fullName.trim(),
      email: profileData.email.trim(),
    };
    if (trimmed.fullName.length < 2) {
      setProfileErrors({ fullName: "Full name must be at least 2 characters" });
      return;
    }
    startProfileTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed),
      });
      const data = await res.json();
      if (!res.ok) {
        const errs: Record<string, string> = {};
        if (typeof data.error === "object") {
          for (const [k, v] of Object.entries(data.error))
            errs[k] = Array.isArray(v) ? (v[0] as string) : (v as string);
        } else {
          errs._general = data.error ?? "Failed to save";
        }
        setProfileErrors(errs);
        return;
      }
      setProfileData({ fullName: data.fullName, email: data.email });
      await updateSession({ name: data.fullName, email: data.email });
      router.refresh();
      toast.success({ title: "Profile updated" });
    });
  }

  // ── Password ────────────────────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordPending, startPasswordTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErrors({});
    const errors: Record<string, string> = {};
    if (!passwordData.currentPassword)
      errors.currentPassword = "Current password is required";
    if (passwordData.newPassword.length < 8)
      errors.newPassword = "New password must be at least 8 characters";
    if (passwordData.newPassword !== passwordData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    startPasswordTransition(async () => {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });
      const data = await res.json();
      if (!res.ok) {
        const errs: Record<string, string> = {};
        if (typeof data.error === "object") {
          for (const [k, v] of Object.entries(data.error))
            errs[k] = Array.isArray(v) ? (v[0] as string) : (v as string);
        } else {
          errs._general = data.error ?? "Failed to change password";
        }
        setPasswordErrors(errs);
        return;
      }
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success({ title: "Password changed successfully" });
    });
  }

  const roleLabel = user.role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const isAgentRole = user.role === "sales_agent" || user.role === "rsr";

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ═══════════════════════════════════════════════════════
          HERO — identity banner
      ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* green left accent bar */}
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-primary" />
        {/* very subtle green tint wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(120deg, oklch(0.97 0.02 141) 0%, oklch(0.99 0.005 141) 60%, white 100%)" }}
        />

        <div className="relative flex flex-col gap-5 py-6 pr-6 pl-8 sm:flex-row sm:items-center sm:gap-6">
          {/* Avatar */}
          <div className="group relative shrink-0">
            <button
              type="button"
              disabled={avatarPending}
              onClick={() => fileInputRef.current?.click()}
              className="relative block h-20 w-20 cursor-pointer rounded-xl ring-2 ring-zinc-200 transition hover:ring-primary/40 focus-visible:outline-none"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${user.fullName} avatar`}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/8 text-xl font-bold text-primary/60">
                  {initials || "U"}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition group-hover:bg-black/20">
                <Camera className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
              </div>
              {avatarPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </button>
            {avatarUrl && !avatarPending && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                title="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600 focus-visible:outline-none"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              {profileData.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {roleLabel}
              </span>
              {user.agentCode && (
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs text-zinc-500">
                  {user.agentCode}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{profileData.email}</p>
          </div>

          <p className="hidden text-xs text-zinc-400 sm:block">Click avatar to change</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          TWO-COLUMN: Profile Settings + Change Password
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Profile Settings ─────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pencil className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Profile Settings</p>
              <p className="text-xs text-zinc-400">Update your name and email</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="flex flex-1 flex-col gap-4 p-5">
            {profileErrors._general && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {profileErrors._general}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileData.fullName}
                onChange={(e) =>
                  setProfileData((p) => ({ ...p, fullName: e.target.value }))
                }
                placeholder="Your full name"
                aria-invalid={!!profileErrors.fullName}
              />
              <FieldError message={profileErrors.fullName} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) =>
                  setProfileData((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="you@example.com"
                aria-invalid={!!profileErrors.email}
              />
              <FieldError message={profileErrors.email} />
            </div>

            <div className="mt-auto flex justify-end pt-1">
              <Button type="submit" disabled={profilePending}>
                {profilePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* ── Change Password ───────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Change Password</p>
              <p className="text-xs text-zinc-400">Keep your account secure</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} className="flex flex-1 flex-col gap-4 p-5">
            {passwordErrors._general && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {passwordErrors._general}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(v) =>
                  setPasswordData((p) => ({ ...p, currentPassword: v }))
                }
                show={showCurrent}
                onToggleShow={() => setShowCurrent((x) => !x)}
                placeholder="Enter current password"
                invalid={!!passwordErrors.currentPassword}
              />
              <FieldError message={passwordErrors.currentPassword} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(v) =>
                  setPasswordData((p) => ({ ...p, newPassword: v }))
                }
                show={showNew}
                onToggleShow={() => setShowNew((x) => !x)}
                placeholder="Min. 8 characters"
                invalid={!!passwordErrors.newPassword}
              />
              <FieldError message={passwordErrors.newPassword} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(v) =>
                  setPasswordData((p) => ({ ...p, confirmPassword: v }))
                }
                show={showConfirm}
                onToggleShow={() => setShowConfirm((x) => !x)}
                placeholder="Repeat new password"
                invalid={!!passwordErrors.confirmPassword}
              />
              <FieldError message={passwordErrors.confirmPassword} />
            </div>

            {passwordData.newPassword.length > 0 && (
              <PasswordStrength password={passwordData.newPassword} />
            )}

            <div className="mt-auto flex justify-end pt-1">
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ACCOUNT DETAILS — horizontal info strip
      ══════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-3.5">
          <p className="text-sm font-semibold text-zinc-800">Account Details</p>
          <p className="text-xs text-zinc-400">Read-only — managed by your administrator</p>
        </div>

        <div className={cn(
          "grid grid-cols-1 gap-3 p-4 sm:grid-cols-2",
          isAgentRole ? "lg:grid-cols-5" : "lg:grid-cols-4"
        )}>
          <DetailTile
            icon={<AtSign className="h-4 w-4" />}
            label="Email"
            value={profileData.email}
            truncate
          />
          <DetailTile
            icon={<Shield className="h-4 w-4" />}
            label="Role"
            value={roleLabel}
          />
          {isAgentRole && (
            <DetailTile
              icon={<UserRound className="h-4 w-4" />}
              label="Manager"
              value={user.managerName ?? "Not assigned"}
            />
          )}
          <DetailTile
            icon={<Hash className="h-4 w-4" />}
            label="Agent Code"
            value={user.agentCode ?? "Not assigned"}
          />
          <DetailTile
            icon={<Fingerprint className="h-4 w-4" />}
            label="User ID"
            value={user.id}
            mono
            truncate
          />
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9"
        aria-invalid={invalid}
      />
      <button
        type="button"
        onClick={onToggleShow}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  value,
  mono = false,
  truncate = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
      <div className="flex items-center gap-1.5 text-primary/60">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={cn(
          "text-sm font-medium text-zinc-800",
          mono && "font-mono text-xs text-zinc-500",
          truncate && "truncate"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const { label: strengthLabel, bar: barColor, text: textColor } =
    passed <= 1
      ? { label: "Weak", bar: "bg-red-400", text: "text-red-500" }
      : passed <= 3
        ? { label: "Fair", bar: "bg-amber-400", text: "text-amber-500" }
        : passed === 4
          ? { label: "Good", bar: "bg-blue-400", text: "text-blue-500" }
          : { label: "Strong", bar: "bg-green-500", text: "text-green-600" };

  return (
    <div className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= passed ? barColor : "bg-zinc-200"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-semibold", textColor)}>{strengthLabel}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={cn("text-xs", c.ok ? "text-green-600" : "text-zinc-400")}
          >
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
