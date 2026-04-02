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
import { CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ManagerActionsProps {
  cisId: string;
}

export function ManagerActions({ cisId }: ManagerActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"endorse" | "return" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function openDialog(a: "endorse" | "return") {
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
      setOpen(false);
      toast.success(action === "endorse" ? "Approved and forwarded to Finance." : "Sent back to agent.");
      router.push("/manager");
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
          <Button onClick={() => openDialog("endorse")} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approve &amp; Forward
          </Button>
          <Button
            variant="outline"
            onClick={() => openDialog("return")}
            className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <RotateCcw className="h-4 w-4" />
            Send Back to Agent
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "endorse" ? "Approve & Forward to Finance" : "Send Back to Agent"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "endorse"
              ? "You are approving this submission and forwarding it to the Finance team for review. You may add an optional note."
              : "You are sending this form back to the agent for corrections. Please explain what needs to be fixed."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "endorse" ? "Note (optional)" : "Reason *"}
            </Label>
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "endorse"
                  ? "Any notes for the Finance team… (optional)"
                  : "Describe what needs to be fixed…"
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
              variant={action === "return" ? "destructive" : "default"}
            >
              {isLoading
                ? "Submitting…"
                : action === "endorse"
                ? "Approve & Forward"
                : "Yes, Send Back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
