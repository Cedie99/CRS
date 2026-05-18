"use client";

import { useState, useEffect } from "react";
import { Download, FileText, Table2, BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { cn, humanizeDisplayValue } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

type Format = "csv" | "excel" | "pdf";

interface PreviewRow {
  no: number;
  tradeName: string;
  contactPerson: string;
  customerType: string;
  status: string;
  agentCode: string;
  createdAt: string;
  updatedAt: string;
}

interface PreviewData {
  rows: PreviewRow[];
  total: number;
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-50 text-blue-700",
  distributor: "bg-teal-50 text-teal-700",
  private_label: "bg-violet-50 text-violet-700",
  toll_blend: "bg-orange-50 text-orange-700",
  end_user: "bg-green-50 text-green-700",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_legal_review", label: "Pending Legal Review" },
  { value: "pending_finance_review", label: "Pending Finance Review" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "pending_erp_encoding", label: "Pending ERP Encoding" },
  { value: "erp_encoded", label: "ERP Encoded" },
  { value: "denied", label: "Denied" },
  { value: "returned", label: "Returned" },
];

const FORMAT_OPTIONS: {
  value: Format;
  label: string;
  ext: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "csv", label: "CSV", ext: ".csv", Icon: FileText },
  { value: "excel", label: "Excel", ext: ".xlsx", Icon: Table2 },
  { value: "pdf", label: "PDF", ext: ".pdf", Icon: BookOpen },
];

export function AdminExportPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState<Format>("excel");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function fetchPreview(opts?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ scope: "admin", preview: "1" });
      if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
      if (opts?.dateTo) params.set("dateTo", opts.dateTo);
      if (opts?.status) params.set("status", opts.status);
      const res = await fetch(`/api/cis/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setPreview(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoadPreview() {
    fetchPreview({ dateFrom, dateTo, status });
  }

  function handleDownload() {
    const params = new URLSearchParams({ scope: "admin", format });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (status) params.set("status", status);
    window.location.href = `/api/cis/export?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Export Report</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Preview and download filtered submission records.
        </p>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              Date from <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              Date to <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-52 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-0.5 flex items-center gap-2">
            {(dateFrom || dateTo || status) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setStatus("");
                  fetchPreview();
                }}
                disabled={loading}
                className="text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLoadPreview}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {loading ? "Loading…" : "Load Preview"}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {/* Card header: title + format toggle + download */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-700">Preview</h2>
              {preview !== null && (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-600">
                  {preview.total.toLocaleString()} records
                </span>
              )}
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
            </div>
            {!loading && preview !== null && preview.total > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {preview.total > preview.rows.length
                  ? `Showing first ${preview.rows.length} of ${preview.total.toLocaleString()} — download to see all`
                  : `All ${preview.total.toLocaleString()} records shown`}
              </p>
            )}
          </div>

          {/* Format toggle + download */}
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {FORMAT_OPTIONS.map(({ value, label, ext, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  title={ext}
                  className={cn(
                    "flex items-center gap-1.5 border-r border-zinc-200 px-3 py-1.5 text-xs font-medium last:border-r-0 transition-colors",
                    format === value
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleDownload}
              disabled={!preview || preview.total === 0}
            >
              <Download className="h-3.5 w-3.5" />
              {preview && preview.total > 0
                ? `Download ${preview.total.toLocaleString()} records`
                : "Download"}
            </Button>
          </div>
        </div>

        {/* States */}
        {loading && preview === null && (
          <div className="flex items-center justify-center py-24 text-sm text-zinc-400">
            Loading preview…
          </div>
        )}

        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-zinc-400">
            <p>Failed to load preview.</p>
            <Button variant="outline" size="sm" onClick={handleLoadPreview}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !loadError && preview !== null && preview.rows.length === 0 && (
          <div className="flex items-center justify-center py-24 text-sm text-zinc-400">
            No records match the selected filters.
          </div>
        )}

        {/* Table */}
        {preview !== null && preview.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="w-10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">#</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Trade Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact Person</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Agent</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Submitted</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {preview.rows.map((row) => (
                  <tr key={row.no} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3.5 tabular-nums text-xs text-zinc-400">{row.no}</td>
                    <td className="max-w-[220px] px-4 py-3.5 font-medium text-zinc-900">
                      <span className="block truncate">{row.tradeName}</span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600">{row.contactPerson}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          CUSTOMER_TYPE_COLORS[row.customerType] ?? "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {CUSTOMER_TYPE_LABELS[row.customerType] ?? humanizeDisplayValue(row.customerType)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status as CisStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                        {row.agentCode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-400">{row.createdAt}</td>
                    <td className="px-4 py-3.5 text-xs text-zinc-400">{row.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
