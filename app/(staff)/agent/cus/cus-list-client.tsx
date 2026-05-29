"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CusNewForm } from "./new/cus-new-form";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_finance_review: "Pending Finance Review",
  pending_legal_review: "Pending Legal Review",
  approved: "Approved",
  denied: "Denied",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  pending_finance_review: "bg-amber-50 text-amber-700 border-amber-200",
  pending_legal_review: "bg-purple-50 text-purple-700 border-purple-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  denied: "bg-red-50 text-red-700 border-red-200",
};

interface CusRow {
  id: string;
  status: string;
  createdAt: Date;
  note: string | null;
  financeCreditTerms: string | null;
  financeCreditLimit: string | null;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string | null;
}

interface ApprovedCis {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string | null;
  status: string;
  cityMunicipality: string | null;
  businessType: string | null;
  paymentTerms: string | null;
}

export function CusListClient({
  cusList,
  approvedCisList,
}: {
  cusList: CusRow[];
  approvedCisList: ApprovedCis[];
}) {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pr-12 sm:pr-14">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-xl bg-teal-50 p-2.5">
            <RefreshCw className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Customer Updates</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Customer Update Sheet requests you&apos;ve submitted.
            </p>
          </div>
        </div>
        <Button size="sm" className="self-start shrink-0 sm:mt-0.5" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New CUS
        </Button>
      </div>

      {/* List */}
      {cusList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No customer updates yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create a Customer Update Sheet when a customer wants to apply for credit terms or update their information.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New CUS
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {cusList.map((cus) => (
              <li key={cus.id}>
                <Link
                  href={`/agent/cus/${cus.id}`}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {cus.tradeName ?? "(Unnamed)"}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[cus.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                        {STATUS_LABELS[cus.status] ?? cus.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {cus.contactPerson && (
                        <span className="text-xs text-zinc-500">{cus.contactPerson}</span>
                      )}
                      <span className="text-xs text-zinc-400 capitalize">
                        {cus.customerType?.replace(/_/g, " ") ?? "—"}
                      </span>
                      {cus.status === "approved" && cus.financeCreditTerms && (
                        <span className="text-xs font-medium text-green-700">
                          → {cus.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          {cus.financeCreditLimit ? ` · ${cus.financeCreditLimit}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[11px] text-zinc-400">
                      {new Date(cus.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New CUS modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent
          className="sm:max-w-2xl w-full flex flex-col p-0 gap-0 max-h-[90vh] top-[50%]"
          showCloseButton
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
            <DialogTitle>New Customer Update Sheet</DialogTitle>
            <p className="text-sm text-zinc-500 mt-0.5">
              Select a customer and specify what needs to be updated. Leave fields blank to keep current values.
            </p>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 px-6 py-5">
            <CusNewForm approvedCisList={approvedCisList} />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
