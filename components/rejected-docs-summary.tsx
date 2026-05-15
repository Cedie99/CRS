"use client";

import { FileX2, MoveDown } from "lucide-react";
import { DOC_LABELS } from "@/lib/doc-types";
import type { DocType } from "@/lib/doc-types";

interface RejectedDoc {
  key: DocType;
  reason?: string | null;
}

interface RejectedDocsSummaryProps {
  rejectedDocs: RejectedDoc[];
}

export function RejectedDocsSummary({ rejectedDocs }: RejectedDocsSummaryProps) {
  if (rejectedDocs.length === 0) return null;

  function scrollToDoc(key: string) {
    const el = document.getElementById(`doc-upload-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("doc-reject-glow");
    void el.offsetWidth;
    el.classList.add("doc-reject-glow");
    setTimeout(() => el.classList.remove("doc-reject-glow"), 2000);
  }

  return (
    <div className="print:hidden overflow-hidden rounded-xl border border-amber-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 sm:px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-2 ring-amber-200">
          <FileX2 className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">
            {rejectedDocs.length === 1
              ? "1 Document Needs Replacement"
              : `${rejectedDocs.length} Documents Need Replacement`}
          </p>
          <p className="text-xs text-amber-700">
            Upload a new file for each document listed below, then resubmit.
          </p>
        </div>
      </div>

      {/* Document list */}
      <div className="divide-y divide-zinc-100">
        {rejectedDocs.map(({ key, reason }, i) => (
          <button
            key={key}
            type="button"
            onClick={() => scrollToDoc(key)}
            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 sm:px-5"
          >
            {/* Step number */}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600">
              {i + 1}
            </span>

            {/* Doc name + reason */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800">
                {DOC_LABELS[key] ?? key}
              </p>
              {reason ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Reason: <span className="font-medium text-zinc-700">{reason}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-400 italic">No reason given</p>
              )}
            </div>

            {/* Jump affordance */}
            <span className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors group-hover:border-amber-300 group-hover:bg-amber-50 group-hover:text-amber-700">
              <MoveDown className="h-3 w-3" />
              Go to upload
            </span>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="border-t border-amber-100 bg-amber-50/50 px-4 py-2.5 sm:px-5">
        <p className="text-[11px] text-amber-700">
          Click any document above to scroll directly to its upload field.
        </p>
      </div>
    </div>
  );
}
