"use client";

import { useState } from "react";
import { Milestone } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface FloatingWorkflowButtonProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

export function FloatingWorkflowButton({ step, totalSteps, children }: FloatingWorkflowButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB — mobile only */}
      <div className="fixed bottom-6 right-4 z-50 sm:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="View workflow progress"
          className="relative h-12 w-12 rounded-full bg-[#2d6e1e] shadow-lg shadow-[#2d6e1e]/40 ring-2 ring-white/30 transition-transform active:scale-95"
        >
          <Milestone className="mx-auto h-4 w-4 text-white" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold tabular-nums text-[#2d6e1e] shadow">
            {step}/{totalSteps}
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-2">
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
          {children}
        </SheetContent>
      </Sheet>
    </>
  );
}
