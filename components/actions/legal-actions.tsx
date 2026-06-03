"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionNoteTemplates } from "@/components/decision-note-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";

interface LegalActionsProps {
  cisId: string;
}

export function LegalActions({ cisId }: LegalActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"forward" | "return" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function openDialog(a: "forward" | "return" | "reject") {
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

    if ((action === "return" || action === "reject") && note.trim().length < 10) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }

    setIsLoading(true);
    try {
      let endpoint: string;
      if (action === "forward") {
        endpoint = "legal-forward";
      } else if (action === "reject") {
        endpoint = "legal-reject";
      } else {
        endpoint = "legal-deny";
      }
      
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
      if (action === "forward") {
        toast.success({
          title: "Forwarded to Finance.",
          description: "Finance can now review this submission.",
        });
      } else if (action === "reject") {
        toast.error({
          title: "Form rejected.",
          description: "The form has been rejected. The agent must redo the customer fillup and submission.",
        });
      } else {
        toast.error({
          title: "Returned to agent.",
          description: "The form has been returned to the agent with your denial reason.",
        });
      }
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
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button onClick={() => openDialog("forward")} className="w-full gap-2 sm:w-auto">
            <ArrowRight className="h-4 w-4" />
            Forward to Finance
          </Button>
          <Button
            onClick={() => openDialog("return")}
            className="w-full gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 sm:w-auto"
          >
            <XCircle className="h-4 w-4" />
            Return
          </Button>
          <Button
            onClick={() => openDialog("reject")}
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
          >
            <XCircle className="h-4 w-4" />
            Reject Form
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "forward" ? "Forward to Finance" : action === "reject" ? "Reject Form" : "Return to Agent"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "forward"
              ? "You are forwarding this submission to the Finance team. You may add an optional note."
              : action === "reject"
              ? "You are rejecting this entire form. The agent must redo the customer fillup and submission. Please explain why."
              : "You are returning this submission to the agent. Please explain why it needs corrections."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "forward" ? "Note (optional)" : "Reason *"}
            </Label>
            {action === "forward" ? (
              <DecisionNoteTemplates type="legal_forward_note" onSelect={setNote} disabled={isLoading} />
            ) : (
              <DecisionNoteTemplates type="legal_deny_reason" onSelect={setNote} disabled={isLoading} />
            )}
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "forward" ? "Legal clearance notes…" : action === "reject" ? "Reason for rejection…" : "Reason for return…"
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
              variant={action === "return" ? "default" : action === "reject" ? "destructive" : "default"}
            >
              {isLoading
                ? "Submitting…"
                : action === "forward"
                ? "Yes, Forward"
                : action === "reject"
                ? "Yes, Reject"
                : "Yes, Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
