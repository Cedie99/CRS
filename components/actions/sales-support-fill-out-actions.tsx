"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { sileo as toast } from "sileo";

interface SalesSupportFillOutActionsProps {
  cisId: string;
}

export function SalesSupportFillOutActions({ cisId }: SalesSupportFillOutActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cis/${cisId}/sales-support-submit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesSupportNotes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong.");
        return;
      }
      toast.success({
        title: "Submitted to Project Development.",
        description: "The Project Development Specialist has been notified.",
      });
      router.push("/support");
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
          Sales Support Fill-Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="support-notes">Notes (optional)</Label>
          <Textarea
            id="support-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or instructions for the Project Development Specialist…"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full gap-2 sm:w-auto"
        >
          <ArrowRight className="h-4 w-4" />
          {isLoading ? "Submitting…" : "Submit to Project Development"}
        </Button>
      </CardContent>
    </Card>
  );
}
