"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema> | "_form", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ _form: "Invalid email or password. If you just registered, your account needs to be activated by an admin first." });
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden flex-col items-center bg-[#1a1a1a] px-12 py-10 lg:flex lg:w-[45%]">
        {/* Top: logo */}
        <Image
          src="/oracle-logo.png"
          alt="Oracle Petroleum"
          width={160}
          height={48}
          className="h-12 w-auto object-contain"
          priority
        />

        {/* Center: headline */}
        <div className="my-auto flex flex-col items-center text-center">
          <div className="mb-5 h-1 w-10 rounded-full bg-[#f5d220]" />
          <h1 className="text-4xl font-bold leading-tight text-white">
            Welcome back.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-400">
            Sign in to access the Customer Information Sheet platform for Oracle Petroleum Toll Blend Division.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Role-based approval workflow",
              "Real-time submission tracking",
              "Complete audit trail on every form",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2d6e1e]">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm text-zinc-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: tagline */}
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
            <h2 className="text-2xl font-semibold text-zinc-900">Sign in</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errors._form && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {errors._form}
              </div>
            )}

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
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[#2d6e1e] hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
