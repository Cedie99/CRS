"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Camera, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  sales_agent: "Sales Agent",
  rsr: "RSR",
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
  finance_reviewer: "Finance Reviewer",
  legal_approver: "Legal Approver",
  senior_approver: "Senior Approver",
  sales_support: "Sales Support",
  admin: "Admin",
};

interface ProfileClientProps {
  fullName: string;
  email: string;
  role: string;
  agentCode: string | null;
  avatarUrl: string | null;
}

export function ProfileClient({
  fullName: initialFullName,
  email: initialEmail,
  role,
  agentCode,
  avatarUrl: initialAvatarUrl,
}: ProfileClientProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile state
  const [profileName, setProfileName] = useState(initialFullName);
  const [profileEmail, setProfileEmail] = useState(initialEmail);
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = profileName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Upload failed");
        return;
      }
      setAvatarUrl(json.avatarUrl);
      toast.success("Avatar updated.");
      await updateSession({ avatarUrl: json.avatarUrl });
      startTransition(() => router.refresh());
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove avatar");
        return;
      }
      setAvatarUrl(null);
      toast.success("Avatar removed.");
      await updateSession({ avatarUrl: null });
      startTransition(() => router.refresh());
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErrors({});
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profileName, email: profileEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setProfileErrors(json.error ?? {});
        toast.error("Failed to update profile.");
        return;
      }
      toast.success("Profile updated.");
      await updateSession({ name: json.fullName, email: json.email });
      startTransition(() => router.refresh());
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErrors({});
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordErrors(json.error ?? {});
        toast.error("Failed to update password.");
        return;
      }
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your avatar and account info.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Avatar + account info */}
        <div className="rounded-xl border bg-white p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-[#2d6e1e]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={profileName}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Change"}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                  className="gap-1.5 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-400">JPEG, PNG, or WebP · Max 2MB</p>
          </div>

          <hr className="border-zinc-100" />

          {/* Account info (read-only) */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name</p>
              <div className="flex items-center gap-2 text-sm text-zinc-900">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                {profileName}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Email</p>
              <p className="text-sm text-zinc-700 break-all">{profileEmail}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Role</p>
              <span className="inline-flex items-center rounded-full bg-[#2d6e1e]/10 px-2.5 py-0.5 text-xs font-medium text-[#2d6e1e]">
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>

            {agentCode && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Agent Code
                </p>
                <p className="font-mono text-sm text-zinc-700">{agentCode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: forms stacked */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit profile card */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Edit Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-xs font-medium text-zinc-600">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2d6e1e] focus:ring-2 focus:ring-[#2d6e1e]/20"
                  />
                  {profileErrors.fullName && (
                    <p className="text-xs text-red-600">{profileErrors.fullName[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-zinc-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2d6e1e] focus:ring-2 focus:ring-[#2d6e1e]/20"
                  />
                  {profileErrors.email && (
                    <p className="text-xs text-red-600">{profileErrors.email[0]}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>

          {/* Change password card */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor="currentPassword" className="text-xs font-medium text-zinc-600">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2d6e1e] focus:ring-2 focus:ring-[#2d6e1e]/20"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-xs text-red-600">{passwordErrors.currentPassword[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-xs font-medium text-zinc-600">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2d6e1e] focus:ring-2 focus:ring-[#2d6e1e]/20"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-xs text-red-600">{passwordErrors.newPassword[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-medium text-zinc-600">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2d6e1e] focus:ring-2 focus:ring-[#2d6e1e]/20"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-xs text-red-600">{passwordErrors.confirmPassword[0]}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingPassword}>
                  {savingPassword ? "Updating…" : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
