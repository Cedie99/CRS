"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download, RefreshCw, TrendingUp, CheckCircle2, XCircle,
  Clock, FileText, Table2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthlyStat {
  month: number;
  label: string;
  total: number;
  erp_encoded: number;
  denied: number;
}

interface TypeStat {
  type: string;
  label: string;
  count: number;
}

interface StatusStat {
  status: string;
  label: string;
  count: number;
}

interface AgentStat {
  agentId: string | null;
  agentCode: string;
  agentName: string;
  total: number;
  erp_encoded: number;
}

interface AnalyticsData {
  year: number;
  summary: {
    totalAll: number;
    erpEncoded: number;
    inPipeline: number;
    denied: number;
    draft: number;
  };
  monthly: MonthlyStat[];
  byCustomerType: TypeStat[];
  byStatus: StatusStat[];
  topAgents: AgentStat[];
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-500",
  distributor: "bg-teal-500",
  private_label: "bg-violet-500",
  toll_blend: "bg-orange-500",
  end_user: "bg-emerald-500",
};

const TYPE_PILL: Record<string, string> = {
  dealer: "bg-blue-50 text-blue-700",
  distributor: "bg-teal-50 text-teal-700",
  private_label: "bg-violet-50 text-violet-700",
  toll_blend: "bg-orange-50 text-orange-700",
  end_user: "bg-emerald-50 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  erp_encoded: "bg-emerald-500",
  approved: "bg-green-400",
  pending_erp_encoding: "bg-lime-400",
  pending_approval: "bg-amber-400",
  pending_finance_review: "bg-yellow-400",
  pending_legal_review: "bg-sky-400",
  submitted: "bg-blue-400",
  returned: "bg-orange-400",
  denied: "bg-red-500",
  draft: "bg-zinc-300",
};

// ── Mini bar chart (SVG) ──────────────────────────────────────────────────────

function MonthlyBarChart({ data }: { data: MonthlyStat[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const W = 680;
  const H = 180;
  const PAD_L = 32;
  const PAD_B = 24;
  const PAD_T = 12;
  const chartW = W - PAD_L;
  const chartH = H - PAD_B - PAD_T;
  const slotW = chartW / 12;
  const barW = Math.min(slotW * 0.35, 18);
  const gap = barW * 0.5;

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PAD_T + chartH * (1 - frac),
    label: frac === 0 ? "0" : Math.round(maxVal * frac).toString(),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 400 }}
        aria-label="Monthly submissions chart"
      >
        {/* Grid lines */}
        {gridLines.map((g) => (
          <g key={g.y}>
            <line
              x1={PAD_L} y1={g.y} x2={W} y2={g.y}
              stroke="#e4e4e7" strokeWidth={0.6}
            />
            <text x={PAD_L - 4} y={g.y + 3.5} textAnchor="end" fontSize={8} fill="#a1a1aa">
              {g.label}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const slotX = PAD_L + i * slotW;
          const centerX = slotX + slotW / 2;

          const totalH = (d.total / maxVal) * chartH;
          const erpH = (d.erp_encoded / maxVal) * chartH;
          const deniedH = (d.denied / maxVal) * chartH;

          const totalX = centerX - gap / 2 - barW;
          const erpX = centerX - barW / 2;
          const deniedX = centerX + gap / 2;

          const baseY = PAD_T + chartH;

          return (
            <g key={d.month}>
              {/* Total bar */}
              {d.total > 0 && (
                <rect
                  x={totalX} y={baseY - totalH}
                  width={barW} height={totalH}
                  fill="#6366f1" rx={2}
                  opacity={0.85}
                >
                  <title>{`${d.label}: ${d.total} submitted`}</title>
                </rect>
              )}
              {/* ERP encoded bar */}
              {d.erp_encoded > 0 && (
                <rect
                  x={erpX} y={baseY - erpH}
                  width={barW} height={erpH}
                  fill="#10b981" rx={2}
                  opacity={0.9}
                >
                  <title>{`${d.label}: ${d.erp_encoded} onboarded`}</title>
                </rect>
              )}
              {/* Denied bar */}
              {d.denied > 0 && (
                <rect
                  x={deniedX} y={baseY - deniedH}
                  width={barW} height={deniedH}
                  fill="#f43f5e" rx={2}
                  opacity={0.8}
                >
                  <title>{`${d.label}: ${d.denied} denied`}</title>
                </rect>
              )}
              {/* Month label */}
              <text
                x={centerX} y={baseY + 14}
                textAnchor="middle" fontSize={8.5} fill="#71717a"
              >
                {d.label}
              </text>
              {/* Value above tallest bar */}
              {d.total > 0 && (
                <text
                  x={totalX + barW / 2} y={baseY - totalH - 3}
                  textAnchor="middle" fontSize={7} fill="#6366f1" fontWeight="600"
                >
                  {d.total}
                </text>
              )}
            </g>
          );
        })}

        {/* X baseline */}
        <line
          x1={PAD_L} y1={PAD_T + chartH} x2={W} y2={PAD_T + chartH}
          stroke="#d4d4d8" strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 px-1">
        {[
          { color: "bg-indigo-500", label: "Submitted" },
          { color: "bg-emerald-500", label: "Onboarded (ERP Encoded)" },
          { color: "bg-rose-500", label: "Denied" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className={cn("h-2.5 w-2.5 rounded-sm", l.color)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Progress bar row ───────────────────────────────────────────────────────────

function ProgressBar({
  label,
  count,
  total,
  colorClass,
  pillClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  pillClass?: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0">
        {pillClass ? (
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", pillClass)}>
            {label}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">{label}</span>
        )}
      </div>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 shrink-0 text-right">
        <span className="text-xs font-semibold tabular-nums text-zinc-700">{count.toLocaleString()}</span>
        <span className="ml-1 text-[10px] text-zinc-400">({pct.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-4 shadow-xs">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-zinc-900">{value.toLocaleString()}</p>
        {sub && <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminAnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/analytics?year=${y}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  function handleDownload(fmt: "csv" | "excel") {
    window.location.href = `/api/admin/analytics?year=${year}&format=${fmt}`;
  }

  const totalAll = data?.summary.totalAll ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 lg:pr-14">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Analytics</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Monthly submission and onboarding trends across all agents.
          </p>
        </div>

        {/* Year nav + export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year picker */}
          <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button
              onClick={() => setYear((y) => y - 1)}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3.5rem] px-2 text-center text-sm font-semibold text-zinc-800">
              {year}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={loading || year >= currentYear}
              className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40"
              aria-label="Next year"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(year)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Loading…" : "Refresh"}
          </Button>

          {/* Export buttons */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => handleDownload("csv")}
              disabled={!data}
              title="Download CSV"
              className="flex items-center gap-1.5 border-r border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-40"
            >
              <FileText className="h-3 w-3" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleDownload("excel")}
              disabled={!data}
              title="Download Excel"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-40"
            >
              <Table2 className="h-3 w-3" />
              Excel
            </button>
          </div>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleDownload("excel")}
            disabled={!data}
          >
            <Download className="h-3.5 w-3.5" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 py-10 text-sm text-red-500">
          <p>Failed to load analytics data.</p>
          <Button variant="outline" size="sm" onClick={() => fetchData(year)}>Try again</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Submissions"
              value={data.summary.totalAll}
              sub={`All statuses in ${year}`}
              icon={TrendingUp}
              color="bg-indigo-500"
            />
            <StatCard
              label="Customers Onboarded"
              value={data.summary.erpEncoded}
              sub="ERP encoded (complete)"
              icon={CheckCircle2}
              color="bg-emerald-600"
            />
            <StatCard
              label="In Pipeline"
              value={data.summary.inPipeline}
              sub="Active workflow stages"
              icon={Clock}
              color="bg-amber-500"
            />
            <StatCard
              label="Denied"
              value={data.summary.denied}
              sub="Final rejection"
              icon={XCircle}
              color="bg-rose-500"
            />
          </div>

          {/* Monthly chart */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">Monthly Overview — {year}</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Submissions, onboarded, and denied per month</p>
              </div>
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
            </div>
            <div className="p-5">
              <MonthlyBarChart data={data.monthly} />
            </div>

            {/* Monthly table */}
            <div className="overflow-x-auto border-t border-zinc-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">Submitted</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-emerald-600">Onboarded</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-rose-500">Denied</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {data.monthly.map((m) => {
                    const rate = m.total > 0 ? ((m.erp_encoded / m.total) * 100).toFixed(0) : "—";
                    return (
                      <tr key={m.month} className={cn("transition-colors hover:bg-zinc-50", m.total === 0 && "opacity-40")}>
                        <td className="px-4 py-2.5 font-medium text-zinc-700">{m.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">{m.total || "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600">{m.erp_encoded || "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-rose-500">{m.denied || "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                          {m.total > 0 ? `${rate}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                    <td className="px-4 py-2.5 text-zinc-700">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-800">
                      {data.monthly.reduce((s, m) => s + m.total, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                      {data.monthly.reduce((s, m) => s + m.erp_encoded, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rose-600">
                      {data.monthly.reduce((s, m) => s + m.denied, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                      {totalAll > 0
                        ? `${((data.summary.erpEncoded / totalAll) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom grid: by type + by status + top agents */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* By customer type */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-zinc-700">By Customer Type</h2>
                <p className="mt-0.5 text-xs text-zinc-400">{totalAll.toLocaleString()} total</p>
              </div>
              <div className="space-y-3 p-5">
                {data.byCustomerType.length === 0 ? (
                  <p className="text-sm text-zinc-400">No data for {year}.</p>
                ) : (
                  data.byCustomerType.map((r, i) => (
                    <ProgressBar
                      key={`${r.type}-${i}`}
                      label={r.label}
                      count={r.count}
                      total={totalAll}
                      colorClass={TYPE_COLORS[r.type] ?? "bg-zinc-400"}
                      pillClass={TYPE_PILL[r.type]}
                    />
                  ))
                )}
              </div>
            </div>

            {/* By status */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-zinc-700">By Status</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Current distribution</p>
              </div>
              <div className="space-y-3 p-5">
                {data.byStatus.length === 0 ? (
                  <p className="text-sm text-zinc-400">No data for {year}.</p>
                ) : (
                  data.byStatus.map((r) => (
                    <ProgressBar
                      key={r.status}
                      label={r.label}
                      count={r.count}
                      total={totalAll}
                      colorClass={STATUS_COLORS[r.status] ?? "bg-zinc-400"}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Top agents */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-zinc-700">Top Agents</h2>
                <p className="mt-0.5 text-xs text-zinc-400">By total submissions in {year}</p>
              </div>
              <div className="overflow-x-auto">
                {data.topAgents.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-zinc-400">No agent data for {year}.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">#</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Agent</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">Sub.</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-emerald-600">ERP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {data.topAgents.map((a, i) => (
                        <tr key={a.agentId ?? a.agentCode} className="transition-colors hover:bg-zinc-50">
                          <td className="px-4 py-2.5 text-xs tabular-nums text-zinc-400">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <p className="max-w-[110px] truncate text-xs font-medium text-zinc-800">{a.agentName}</p>
                            <span className="mt-0.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] text-zinc-500">
                              {a.agentCode}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs text-zinc-600">{a.total}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-emerald-600">{a.erp_encoded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
