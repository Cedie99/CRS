"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LegalActionsProps {
  cisId: string;
}

export function LegalActions({ cisId }: LegalActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<"forward" | "deny" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!action) return;
    setError("");

    if (action === "deny" && note.trim().length < 10) {
      setError("Please provide a denial reason of at least 10 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = action === "forward" ? "legal-forward" : "legal-deny";
      const res = await fetch(`/api/cis/${cisId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      toast.success(
        action === "forward"
          ? "CIS forwarded to Finance."
          : "CIS denied."
      );
      router.push("/legal");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Legal Review Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!action ? (
          <div className="flex gap-3">
            <Button onClick={() => setAction("forward")} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Forward to Finance
            </Button>
            <Button
              variant="outline"
              onClick={() => setAction("deny")}
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              Deny
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">
              {action === "forward"
                ? "Forwarding to Finance — you may add an optional note."
                : "Denying this submission — please provide a reason."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="note">
                {action === "forward" ? "Note (optional)" : "Denial reason *"}
              </Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  action === "forward"
                    ? "Legal clearance notes…"
                    : "Reason for denial…"
                }
                disabled={isLoading}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                variant={action === "deny" ? "destructive" : "default"}
              >
                {isLoading
                  ? "Submitting…"
                  : action === "forward"
                  ? "Confirm Forward"
                  : "Confirm Denial"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setAction(null); setNote(""); setError(""); }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
