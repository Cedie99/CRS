"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CtrNewForm } from "./new/ctr-new-form";

interface ApprovedCis {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string | null;
  status: string;
  cityMunicipality: string | null;
  postalCode?: string | null;
  businessType: string | null;
}

export function CtrNewModal({
  approvedCisList,
  variant = "button",
}: {
  approvedCisList: ApprovedCis[];
  variant?: "button" | "empty-state";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          New CTR
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          New Reclassification
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Reclassification Request</DialogTitle>
            <DialogDescription>
              Request a change to a customer&apos;s type classification.
            </DialogDescription>
          </DialogHeader>
          <CtrNewForm approvedCisList={approvedCisList} />
        </DialogContent>
      </Dialog>
    </>
  );
}
