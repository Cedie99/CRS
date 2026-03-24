"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Search, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_endorsement", label: "Pending Endorsement" },
  { value: "pending_legal_review", label: "Pending Legal Review" },
  { value: "pending_finance_review", label: "Pending Finance Review" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "erp_encoded", label: "ERP Encoded" },
  { value: "denied", label: "Denied" },
  { value: "returned", label: "Returned" },
];

interface DashboardFiltersProps {
  /** Which status options to show (defaults to all) */
  statusOptions?: typeof STATUS_OPTIONS;
  showStatusFilter?: boolean;
}

export function DashboardFilters({
  statusOptions = STATUS_OPTIONS,
  showStatusFilter = true,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const hasFilters = q || status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search by name…"
          defaultValue={q}
          onChange={(e) => updateParams({ q: e.target.value })}
          className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
      </div>

      {showStatusFilter && (
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => updateParams({ q: "", status: "" })}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
