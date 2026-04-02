"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LegalActionsProps {
  cisId: string;
}

export function LegalActions({ cisId }: LegalActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"forward" | "deny" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function openDialog(a: "forward" | "deny") {
    setAction(a);
    setNote("");
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (isLoading) return;
    setOpen(false);
  }

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
      setOpen(false);
      toast.success(action === "forward" ? "Forwarded to Finance." : "Submission denied.");
      router.push("/legal");
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
          Your Action
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-500">
          Review the customer information above, then choose an action.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => openDialog("forward")} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Forward to Finance
          </Button>
          <Button
            variant="outline"
            onClick={() => openDialog("deny")}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
            Deny
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "forward" ? "Forward to Finance" : "Deny Submission"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "forward"
              ? "You are forwarding this submission to the Finance team. You may add an optional note."
              : "You are denying this submission. Please explain why it cannot be approved."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "forward" ? "Note (optional)" : "Denial reason *"}
            </Label>
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "forward" ? "Legal clearance notes…" : "Reason for denial…"
              }
              disabled={isLoading}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              variant={action === "deny" ? "destructive" : "default"}
            >
              {isLoading
                ? "Submitting…"
                : action === "forward"
                ? "Yes, Forward"
                : "Yes, Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
