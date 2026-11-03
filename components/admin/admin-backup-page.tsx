"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, Loader2, Search, FolderArchive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCustomerTypeLabel } from "@/lib/customer-types";
import { useBackupJob, type BackupSelection } from "@/components/admin/backup-job-provider";

interface BackupRecord {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string | null;
  customerProgram: string | null;
  agentCode: string;
  customerCode: string | null;
  updatedAt: string;
  lastBackupAt: string | null;
  lastBackupByName: string | null;
}

type MatchingRecord = BackupSelection & { id: string };

export type BackupFilter = "all" | "pending" | "downloaded";

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-50 text-blue-700",
  distributor: "bg-teal-50 text-teal-700",
  private_label: "bg-violet-50 text-violet-700",
  toll_blend: "bg-orange-50 text-orange-700",
  end_user: "bg-green-50 text-green-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function AdminBackupPage({
  records,
  matching,
  counts,
  query,
  filter,
}: {
  /** Records on the current page */
  records: BackupRecord[];
  /** Every record matching the current search + filter, across all pages */
  matching: MatchingRecord[];
  counts: Record<BackupFilter, number>;
  query: string;
  filter: BackupFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();
  const { busy, marks, selected, setSelected, startDownload } = useBackupJob();
  const [search, setSearch] = useState(query);

  function navigate(next: { q?: string; filter?: BackupFilter }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const f = next.filter ?? filter;
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounced search → URL (resets to page 1)
  useEffect(() => {
    if (search.trim() === query) return;
    const t = setTimeout(() => navigate({ q: search.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Overlay downloads made this session until the server data catches up
  const withMarks = <T extends { id: string; lastBackupAt: string | null }>(r: T) =>
    marks[r.id] && (!r.lastBackupAt || r.lastBackupAt < marks[r.id].lastBackupAt) ? { ...r, ...marks[r.id] } : r;
  const pageRecords = records.map(withMarks);

  const pageAllSelected = pageRecords.length > 0 && pageRecords.every((r) => selected.has(r.id));
  const allMatchingSelected = matching.length > 0 && matching.every((r) => selected.has(r.id));

  function toggle(r: MatchingRecord) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.set(r.id, { tradeName: r.tradeName, customerCode: r.customerCode, lastBackupAt: r.lastBackupAt });
      return next;
    });
  }

  function setMany(rows: MatchingRecord[], on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const r of rows) {
        if (on) next.set(r.id, { tradeName: r.tradeName, customerCode: r.customerCode, lastBackupAt: r.lastBackupAt });
        else next.delete(r.id);
      }
      return next;
    });
  }

  function runDownload(targets: MatchingRecord[]) {
    if (targets.length === 0 || busy) return;
    const already = targets.map(withMarks).filter((t) => t.lastBackupAt);
    if (already.length > 0) {
      const message =
        targets.length === 1
          ? `"${already[0].tradeName ?? "This record"}" was already downloaded on ${fmtDateTime(already[0].lastBackupAt!)}. Download it again?`
          : `${already.length} of the ${targets.length} selected records were already downloaded. Download them again?\n\nChoose Cancel, then use the "Not downloaded" filter to pick only new records.`;
      if (!confirm(message)) return;
    }
    startDownload(targets);
  }

  const filterTabs: { value: BackupFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Not downloaded" },
    { value: "downloaded", label: "Downloaded" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Backup Records</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Download the CIS form (PDF) of customers already encoded in the ERP. Downloads keep running while you
          browse other pages.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">ERP-Encoded Customers</h2>
              {isNavigating && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
            </div>
            <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => navigate({ filter: tab.value })}
                  className={cn(
                    "flex items-center gap-1.5 border-r border-zinc-200 px-3 py-1.5 text-xs font-medium last:border-r-0 transition-colors",
                    filter === tab.value
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                  )}
                >
                  {tab.label}
                  <span className="tabular-nums text-zinc-400">{counts[tab.value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, agent…"
                className="w-60 pl-8"
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => runDownload([...selected].map(([id, s]) => ({ id, ...s })))}
              disabled={busy || selected.size === 0}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {busy ? "Download in progress…" : `Download selected (${selected.size})`}
            </Button>
          </div>
        </div>

        {/* Selection bar — selection is kept across pages */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-emerald-100 bg-emerald-50/60 px-5 py-2 text-xs text-emerald-800">
            <span>
              <span className="font-semibold">{selected.size}</span> selected
              {matching.length > pageRecords.length && " (across all pages)"}
            </span>
            {!allMatchingSelected && matching.length > pageRecords.length && (
              <button
                type="button"
                onClick={() => setMany(matching, true)}
                disabled={busy}
                className="font-medium underline-offset-2 hover:underline"
              >
                Select all {matching.length} matching records
              </button>
            )}
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Map())}
                disabled={busy}
                className="font-medium text-emerald-700/70 underline-offset-2 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {pageRecords.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-sm text-zinc-400">
            {counts.all === 0 && !query
              ? "No ERP-encoded customers yet."
              : filter === "pending" && !query
                ? "All ERP-encoded customers have been downloaded."
                : "No records match your search."}
          </div>
        ) : (
          <div className={cn("overflow-x-auto transition-opacity", isNavigating && "opacity-60")}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={pageAllSelected}
                      onChange={() => setMany(pageRecords, !pageAllSelected)}
                      disabled={busy}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Trade Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Customer Code</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Agent</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Encoded</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Backup</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {pageRecords.map((r) => {
                  const customerType = r.customerType ?? "end_user";
                  return (
                    <tr
                      key={r.id}
                      className={cn("transition-colors hover:bg-zinc-50", selected.has(r.id) && "bg-emerald-50/40")}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.tradeName ?? "record"}`}
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r)}
                          disabled={busy}
                          className="h-4 w-4 cursor-pointer accent-emerald-600"
                        />
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <Link href={`/admin/${r.id}`} className="block truncate font-medium text-zinc-900 hover:underline">
                          {r.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                        </Link>
                        {r.contactPerson && <span className="block truncate text-xs text-zinc-400">{r.contactPerson}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.customerCode ? (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-green-700">
                            {r.customerCode}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
                          )}
                        >
                          {formatCustomerTypeLabel(customerType, r.customerProgram)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                          {r.agentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{fmtDate(r.updatedAt)}</td>
                      <td className="px-4 py-3.5">
                        {r.lastBackupAt ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Downloaded
                            </span>
                            <span className="mt-0.5 block whitespace-nowrap text-[11px] text-zinc-400">
                              {fmtDateTime(r.lastBackupAt)}
                              {r.lastBackupByName && ` · ${r.lastBackupByName}`}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Not downloaded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => runDownload([r])} disabled={busy}>
                          <Download className="h-3.5 w-3.5" />
                          {r.lastBackupAt ? "Download again" : "Download"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
