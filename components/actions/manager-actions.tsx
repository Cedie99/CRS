"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ManagerActionsProps {
  cisId: string;
}

export function ManagerActions({ cisId }: ManagerActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<"endorse" | "return" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!action) return;
    setError("");

    if (action === "return" && note.trim().length < 10) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = action === "endorse" ? "endorse" : "return";
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
      toast.success(action === "endorse" ? "CIS endorsed." : "CIS returned to agent.");
      router.push("/manager");
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
          Your Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!action ? (
          <div className="flex gap-3">
            <Button onClick={() => setAction("endorse")} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Endorse
            </Button>
            <Button
              variant="outline"
              onClick={() => setAction("return")}
              className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <RotateCcw className="h-4 w-4" />
              Return to Agent
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">
              {action === "endorse"
                ? "Endorsing this submission — you may add an optional note."
                : "Returning this submission — please provide a reason."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="note">
                {action === "endorse" ? "Note (optional)" : "Reason *"}
              </Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  action === "endorse"
                    ? "Any remarks for the reviewer…"
                    : "Explain what needs to be corrected…"
                }
                disabled={isLoading}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                variant={action === "return" ? "destructive" : "default"}
              >
                {isLoading
                  ? "Submitting…"
                  : action === "endorse"
                  ? "Confirm Endorsement"
                  : "Confirm Return"}
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
