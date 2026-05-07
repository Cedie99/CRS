"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, CheckCircle } from "lucide-react";

type FieldErrors = Partial<Record<"newPassword" | "confirmPassword" | "_form", string>>;

export default function ChangePasswordPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrors({ _form: json.error ?? "Something went wrong." });
        return;
      }

      // Show success state, then sign out so the user gets a fresh JWT on next login
      setDone(true);
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 2000);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left panel */}
      <motion.div
        className="relative hidden flex-col items-center bg-[#1a1a1a] px-12 py-10 lg:flex lg:w-[45%]"
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Image
          src="/oracle-logo.png"
          alt="Oracle Petroleum"
          width={160}
          height={48}
          className="h-12 w-auto object-contain"
          priority
        />
        <div className="my-auto flex flex-col items-center text-center">
          <div className="mb-5 h-1 w-10 rounded-full bg-[#f5d220]" />
          <h1 className="text-4xl font-bold leading-tight text-white">Set your password.</h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-400">
            Your account was created by an administrator. Please set a personal password before continuing.
          </p>
        </div>
        <div className="flex w-full items-center gap-2">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">No. 1 Toll Blender in the Country</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
      </motion.div>

      {/* Right panel */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 sm:py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
      >
        {done ? (
          <motion.div
            className="w-full max-w-sm text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2d6e1e]/10">
              <CheckCircle className="h-7 w-7 text-[#2d6e1e]" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">Password set successfully</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Redirecting you to sign in with your new password…
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2d6e1e]/10 lg:hidden">
                <KeyRound className="h-6 w-6 text-[#2d6e1e]" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-900">Set your password</h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                Your account was set up by an admin. Choose a password to secure your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errors._form && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {errors._form}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  disabled={isLoading}
                />
                {errors.newPassword && (
                  <p className="text-xs text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
                {isLoading ? "Saving…" : "Set password & continue"}
              </Button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
