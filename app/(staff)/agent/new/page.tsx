"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Link as LinkIcon, Building2, Flame, Star, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CUSTOMER_TYPES = [
  {
    value: "standard",
    label: "Standard",
    description: "Regular customer account. Goes through Manager → Finance → Final Approval.",
    icon: Building2,
    routeNote: null,
    cardColor: "border-zinc-200 hover:border-zinc-400",
    activeColor: "border-[#2d6e1e] bg-green-50 ring-2 ring-[#2d6e1e]/20",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
  {
    value: "fs_petroleum",
    label: "FS Petroleum",
    description: "Fuel station account. Requires Legal Review before going to Finance.",
    icon: Flame,
    routeNote: "Legal Review required first",
    cardColor: "border-zinc-200 hover:border-purple-300",
    activeColor: "border-purple-400 bg-purple-50 ring-2 ring-purple-400/20",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    value: "special",
    label: "Special Account",
    description: "Special or unique cases. Requires Legal Review before going to Finance.",
    icon: Star,
    routeNote: "Legal Review required first",
    cardColor: "border-zinc-200 hover:border-amber-300",
    activeColor: "border-amber-400 bg-amber-50 ring-2 ring-amber-400/20",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export default function NewCisPage() {
  const router = useRouter();
  const [customerType, setCustomerType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!customerType) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/cis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Failed to generate link.");
        return;
      }
      const link = `${window.location.origin}/form/${json.publicToken}`;
      setGeneratedLink(link);
      toast.success("Customer form link generated.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my submissions
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Customer Submission</CardTitle>
          <CardDescription>
            Choose the customer type below. A unique form link will be generated
            for you to share with your customer — they fill it out directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!generatedLink ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700">
                  What type of customer is this? *
                </Label>
                <div className="grid gap-2.5">
                  {CUSTOMER_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = customerType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        disabled={isLoading}
                        onClick={() => setCustomerType(t.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150",
                          isSelected ? t.activeColor : t.cardColor,
                          "disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        <span className={cn("mt-0.5 rounded-lg p-2", t.iconBg)}>
                          <Icon className={cn("h-4 w-4", t.iconColor)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900">{t.label}</span>
                            {t.routeNote && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                <Scale className="h-3 w-3" />
                                {t.routeNote}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-all",
                            isSelected
                              ? "border-[#2d6e1e] bg-[#2d6e1e]"
                              : "border-zinc-300 bg-white"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !customerType}
                >
                  {isLoading ? "Generating…" : "Generate Customer Link"}
                </Button>
                <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <LinkIcon className="h-4 w-4" />
                  Link ready — share it with your customer!
                </div>
                <p className="mt-1 text-xs text-green-600">
                  Send this link to your customer. Once they fill in and submit their information,
                  it will automatically appear in your dashboard and go through the review process.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Shareable link</Label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 rounded-lg border bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-700 outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={() => router.push("/agent")}>
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedLink("");
                    setCustomerType("");
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
