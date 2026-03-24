"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const CUSTOMER_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "fs_petroleum", label: "FS Petroleum" },
  { value: "special", label: "Special" },
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
          <CardTitle>New CIS Submission</CardTitle>
          <CardDescription>
            Select the customer type to generate a form link. Share the link with
            your customer so they can fill out their information directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!generatedLink ? (
            <>
              <div className="space-y-1.5">
                <Label>Customer type *</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) => setCustomerType(v ?? "")}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customerType === "fs_petroleum" && (
                  <p className="text-xs text-purple-600">
                    This submission will be routed to Legal Review first.
                  </p>
                )}
                {customerType === "special" && (
                  <p className="text-xs text-purple-600">
                    This submission will be routed to Legal Review first.
                  </p>
                )}
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3">
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
                  Customer form link generated
                </div>
                <p className="mt-1 text-xs text-green-600">
                  Share this link with your customer. Once they fill and submit the form,
                  it will appear in your dashboard and enter the approval workflow.
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

              <div className="flex gap-3 pt-1">
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
