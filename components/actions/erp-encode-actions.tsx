"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { toast } from "sonner";

interface ErpEncodeActionsProps {
  cisId: string;
  backHref: string;
}

export function ErpEncodeActions({ cisId, backHref }: ErpEncodeActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEncode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cis/${cisId}/erp-encode`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setConfirming(false);
        return;
      }
      toast.success("Customer marked as onboarded.");
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
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-600">
          Once the customer has been entered into the system, mark this submission as fully onboarded.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!confirming ? (
          <Button onClick={() => setConfirming(true)} className="gap-2">
            <Database className="h-4 w-4" />
            Mark as Onboarded
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleEncode} disabled={isLoading}>
              {isLoading ? "Saving…" : "Yes, Mark as Onboarded"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
