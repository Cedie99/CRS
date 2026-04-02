"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_endorsement", label: "Manager Review" },
  { value: "pending_legal_review", label: "Legal Review" },
  { value: "pending_finance_review", label: "Finance Review" },
  { value: "pending_approval", label: "Final Approval" },
  { value: "approved", label: "Approved" },
  { value: "erp_encoded", label: "Onboarded" },
  { value: "denied", label: "Denied" },
  { value: "returned", label: "Sent Back" },
];

interface QuickFilter {
  value: string;
  label: string;
}

interface DashboardFiltersProps {
  quickFilters?: QuickFilter[];
  statusOptions?: typeof STATUS_OPTIONS;
  showStatusFilter?: boolean;
  showArchivedToggle?: boolean;
  archivedCount?: number;
}

export function DashboardFilters({
  quickFilters,
  statusOptions = STATUS_OPTIONS,
  showStatusFilter = true,
  showArchivedToggle = false,
  archivedCount = 0,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const archived = searchParams.get("archived") === "1";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const filterIconActive = filterOpen || status !== "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">

        {/* Quick filter tabs */}
        {quickFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {quickFilters.map((tab) => (
              <button
                key={tab.value}
                onClick={() => updateParams({ status: tab.value })}
                className={cn(
                  "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  status === tab.value
                    ? "border-[#2d6e1e] bg-[#2d6e1e] text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Right-side controls */}
        <div className={cn("flex items-center gap-2", quickFilters && "ml-auto")}>
          {/* Filter icon — only when status filtering is enabled */}
          {showStatusFilter && (
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                filterIconActive
                  ? "border-[#2d6e1e] bg-[#2d6e1e]/10 text-[#2d6e1e]"
                  : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-700"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}

          {/* Search bar */}
          <div className="relative">
            <input
              type="search"
              placeholder="Search a name…"
              defaultValue={q}
              onChange={(e) => updateParams({ q: e.target.value })}
              className="h-9 w-44 rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none sm:w-56"
            />
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>

          {/* Archived toggle */}
          {showArchivedToggle && (
            <button
              onClick={() => updateParams({ archived: archived ? "" : "1", q: "", status: "" })}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors cursor-pointer",
                archived
                  ? "border-zinc-400 bg-zinc-100 font-medium text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700"
              )}
            >
              {archived ? "← Active" : `Archived${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Advanced filter panel */}
      {filterOpen && showStatusFilter && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 shadow-sm">
          <span className="shrink-0 text-xs font-medium text-zinc-400">Status</span>
          <select
            value={status}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="h-8 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {status && (
            <button
              onClick={() => updateParams({ status: "" })}
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-zinc-500 hover:text-zinc-900"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
