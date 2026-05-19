"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "lucide-react";
import { toast } from "@/lib/toast";

interface ErpEncodeActionsProps {
  cisId: string;
  backHref: string;
}

export function ErpEncodeActions({ cisId, backHref }: ErpEncodeActionsProps) {
  const router = useRouter();
  const [customerCode, setCustomerCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEncode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cis/${cisId}/erp-encode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setConfirming(false);
        return;
      }
      toast.success({
        title: "Customer marked as onboarded.",
        description: "This submission is now completed in the workflow.",
      });
      router.push(backHref);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Complete Onboarding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600">
          Enter the customer code assigned in the ERP system, then mark this submission as fully onboarded.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="customer-code" className="text-sm font-medium">
            Customer Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="customer-code"
            value={customerCode}
            onChange={(e) => setCustomerCode(e.target.value)}
            placeholder="e.g. C-00123"
            className="max-w-xs"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!confirming ? (
          <Button
            onClick={() => setConfirming(true)}
            disabled={!customerCode.trim()}
            className="w-full gap-2 sm:w-auto"
          >
            <Database className="h-4 w-4" />
            Mark as Onboarded
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleEncode} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Saving…" : "Yes, Mark as Onboarded"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
