"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback, useState, useRef } from "react";
import { Search, SlidersHorizontal, X, Download, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "",                       label: "All Statuses" },
  { value: "draft",                  label: "Awaiting Customer Submission" },
  { value: "submitted",              label: "Agent Completion" },
  { value: "pending_endorsement",    label: "Manager Review" },
  { value: "pending_legal_review",   label: "Legal Completion" },
  { value: "pending_finance_review", label: "Finance Completion" },
  { value: "pending_approval",       label: "Final Approval" },
  { value: "approved",               label: "Sales Support Completion" },
  { value: "pending_erp_encoding",   label: "ERP Encoding" },
  { value: "erp_encoded",            label: "Onboarded" },
  { value: "denied",                 label: "Denied" },
  { value: "returned",               label: "Returned" },
];

interface DashboardFiltersProps {
  statusOptions?: typeof STATUS_OPTIONS;
  showStatusFilter?: boolean;
  showArchivedToggle?: boolean;
  archivedCount?: number;
  showExportButtons?: boolean;
}

function getExportScope(pathname: string): string | null {
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/manager")) return "manager";
  if (pathname.startsWith("/approver")) return "approver";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/legal")) return "legal";
  if (pathname.startsWith("/support")) return "support";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

export function DashboardFilters({
  statusOptions = STATUS_OPTIONS,
  showStatusFilter = true,
  showArchivedToggle = false,
  archivedCount = 0,
  showExportButtons = false,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const archived = searchParams.get("archived") === "1";
  const exportScope = getExportScope(pathname);

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
  const statusValue = status || "__all__";
  const selectedStatusLabel =
    statusOptions.find((opt) => opt.value === status)?.label ?? "All Statuses";

  const handleExport = useCallback(
    (format: "csv" | "excel" | "pdf") => {
      if (!exportScope) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("queuePage");
      params.delete("historyPage");
      params.set("scope", exportScope);
      params.set("format", format);
      window.location.href = `/api/cis/export?${params.toString()}`;
    },
    [searchParams, exportScope]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">

        <div className="flex w-full flex-wrap items-center gap-2">
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
              <motion.span
                initial={false}
                animate={{ rotate: filterOpen ? 90 : 0, scale: filterOpen ? 1.06 : 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </motion.span>
            </button>
          )}

          {/* Search bar */}
          <div className="relative w-full sm:w-auto">
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search a name…"
              defaultValue={q}
              onChange={(e) => updateParams({ q: e.target.value })}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none sm:w-80"
            />
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                const value = searchInputRef.current?.value ?? "";
                searchInputRef.current?.focus();
                updateParams({ q: value });
              }}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-zinc-400 transition-colors hover:text-zinc-700"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
            <DashboardRefreshButton className="h-8 shrink-0 sm:h-9" />

            {/* Archived toggle */}
            {showArchivedToggle && (
              <button
                onClick={() => updateParams({ archived: archived ? "" : "1", q: "", status: "" })}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors cursor-pointer sm:h-9 sm:text-sm",
                  archived
                    ? "border-zinc-400 bg-zinc-100 font-medium text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700"
                )}
              >
                {archived ? "← Active" : `Archived${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
              </button>
            )}

            {showExportButtons && exportScope && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 sm:h-9"
                  aria-label="Export submissions"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")}>CSV (.csv)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>Excel (.xlsx)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF (.pdf)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Advanced filter panel */}
      <AnimatePresence initial={false}>
        {filterOpen && showStatusFilter && (
          <motion.div
            key="advanced-filter-panel"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="w-full rounded-xl border border-zinc-100 bg-white px-3 py-3 shadow-sm sm:w-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-xs font-medium text-zinc-400">Status</span>
                <Select
                  value={statusValue}
                  onValueChange={(v) => updateParams({ status: v === "__all__" ? "" : (v ?? "") })}
                >
                  <SelectTrigger className="h-9 w-full sm:w-64 md:w-72">
                    <SelectValue>{selectedStatusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status && (
                  <button
                    onClick={() => updateParams({ status: "" })}
                    className="flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
