"use client";

import { Printer, Info, PrinterCheck, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

export function PrintButton({
  cisId,
  disabled = false,
  disabledReason,
}: {
  cisId?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [loading, setLoading] = useState(false);

  function handlePrint() {
    if (disabled || loading || !cisId) return;
    setLoading(true);
    // Open the PDF in a new tab — the browser's PDF viewer lets the user print
    window.open(`/api/cis/${cisId}/pdf`, "_blank");
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="print:hidden inline-flex" />}>
          <button
            onClick={handlePrint}
            disabled={disabled || loading || !cisId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            {loading ? "Opening PDF…" : "Print"}
          </button>
        </TooltipTrigger>

        <TooltipContent side="bottom" sideOffset={6}>
          {disabled ? (
            <div className="flex max-w-57.5 items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="leading-snug">
                {disabledReason ?? "Printing is not available."}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <PrinterCheck className="h-3.5 w-3.5 text-green-400" />
              <span>Open PDF for printing</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
