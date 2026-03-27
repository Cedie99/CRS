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
  fullName,
  email,
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

  const initials = fullName
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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your avatar and account info.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-6">
        {/* Avatar section */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-[#2d6e1e]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={fullName}
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

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Change photo"}
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
            <p className="text-xs text-zinc-400">JPEG, PNG, or WebP · Max 2MB</p>
          </div>
        </div>

        <hr className="border-zinc-100" />

        {/* Account info */}
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name</p>
            <div className="flex items-center gap-2 text-sm text-zinc-900">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              {fullName}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Email</p>
            <p className="text-sm text-zinc-700">{email}</p>
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
    </div>
  );
}
