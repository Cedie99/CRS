"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

type FieldErrors = Partial<
  Record<keyof z.infer<typeof registerSchema> | "_form", string>
>;

export default function RegisterPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const json = await res.json();

      if (!res.ok) {
        const apiErrors = json.error as Record<string, string[]>;
        const mapped: FieldErrors = {};
        for (const key in apiErrors) {
          mapped[key as keyof FieldErrors] = apiErrors[key][0];
        }
        setErrors(mapped);
        return;
      }

      setSubmitted(true);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2d6e1e]/10">
            <CheckCircle className="h-7 w-7 text-[#2d6e1e]" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">Registration submitted</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Your account has been created and is pending activation. An Admin
            will review and activate your account before you can log in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[#2d6e1e] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden flex-col items-center bg-[#1a1a1a] px-12 py-10 lg:flex lg:w-[45%]">
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
          <h1 className="text-4xl font-bold leading-tight text-white">
            Join the platform.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-400">
            Create your account to start submitting and managing Customer Requests for Oracle Petroleum.
          </p>

          <div className="mt-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">How it works</p>
            <ol className="mt-4 space-y-3 text-left">
              {[
                "Register with your name and email",
                "Wait for an Admin to activate your account",
                "Log in and access your role dashboard",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2d6e1e] text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm text-zinc-400">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">No. 1 Toll Blender in the Country</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 lg:hidden">
          <Image
            src="/oracle-logo.png"
            alt="Oracle Petroleum"
            width={140}
            height={42}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900">Create an account</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Your account will be reviewed and activated by an Admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errors._form && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {errors._form}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Juan dela Cruz"
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
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
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#2d6e1e] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
