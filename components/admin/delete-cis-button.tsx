"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { sileo as toast } from "sileo";

export function DeleteCisZone({ cisId, tradeName }: { cisId: string; tradeName?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const name = tradeName?.trim() || "";
  const confirmed = confirmation === name;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmation("");
  }

  async function handleDelete() {
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cis/${cisId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error({ title: "Delete failed.", description: data.error ?? "Failed to delete submission" });
        return;
      }
      setOpen(false);
      toast.success({ title: "Submission deleted." });
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error({ title: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/40">
      <div className="flex items-center gap-2 border-b border-red-200 px-4 py-3">
        <TriangleAlert className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-800">Delete this submission</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Once deleted, all records — workflow events, documents, and activity — will be permanently removed.
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={
            <Button variant="destructive" size="sm" className="shrink-0">
              Delete submission
            </Button>
          } />
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">{name || "this submission"}</span> and all
                related records including workflow events, activity history, and
                notifications. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {name && (
              <div className="space-y-1.5">
                <p className="text-sm text-zinc-600">
                  Type <span className="font-semibold text-zinc-800">{name}</span> to confirm.
                </p>
                <Input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={name}
                  disabled={loading}
                  onPaste={(e) => e.preventDefault()}
                />
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={loading} />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!confirmed || loading}
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
