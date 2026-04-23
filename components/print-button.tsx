"use client";

import { Printer, Info, PrinterCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PrintButton({
  disabled = false,
  disabledReason,
}: {
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        {/* Span as trigger so hover works even when button is disabled */}
        <TooltipTrigger render={<span className="print:hidden inline-flex" />}>
          <button
            onClick={() => { if (!disabled) window.print(); }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
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
              <span>Print this form</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
