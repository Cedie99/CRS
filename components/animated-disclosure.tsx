"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedDisclosureProps {
  title: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  defaultOpen?: boolean;
}

export function AnimatedDisclosure({
  title,
  children,
  className,
  titleClassName,
  defaultOpen = false,
}: AnimatedDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-700",
          "cursor-pointer",
          titleClassName
        )}
        aria-expanded={open}
      >
        <span>{title}</span>
        <motion.span
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="animated-disclosure-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
