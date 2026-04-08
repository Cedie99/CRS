"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardRefreshButtonProps {
  className?: string;
  compact?: boolean;
}

export function DashboardRefreshButton({ className, compact = false }: DashboardRefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      title="Refresh dashboard"
      aria-label="Refresh dashboard"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
      {!compact && <span className="hidden sm:inline">Refresh</span>}
    </button>
  );
}
