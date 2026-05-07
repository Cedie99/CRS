"use client";

import { FileWarning, ArrowRight } from "lucide-react";
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
    // Force reflow so re-clicking the same item re-triggers the animation
    void el.offsetWidth;
    el.classList.add("doc-reject-glow");
    setTimeout(() => el.classList.remove("doc-reject-glow"), 2000);
  }

  return (
    <div className="print:hidden rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 ring-1 ring-orange-200">
          <FileWarning className="h-4 w-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-900">
            {rejectedDocs.length === 1
              ? "1 document needs to be replaced"
              : `${rejectedDocs.length} documents need to be replaced`}
          </p>
          <p className="mt-0.5 text-xs text-orange-700">
            Click a document below to jump directly to its upload field.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {rejectedDocs.map(({ key, reason }) => (
              <button
                key={key}
                type="button"
                onClick={() => scrollToDoc(key)}
                className="group flex items-center gap-2.5 rounded-lg border border-orange-200 bg-white px-3 py-2 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-800">
                    {DOC_LABELS[key] ?? key}
                  </span>
                  {reason && (
                    <span className="block truncate text-[11px] text-zinc-500">{reason}</span>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-orange-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
