import { NextResponse } from "next/server";
import { sql, count, desc, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_legal_review: "Pending Legal Review",
  pending_finance_review: "Pending Finance Review",
  pending_approval: "Pending Approval",
  approved: "Approved",
  pending_erp_encoding: "Pending ERP Encoding",
  erp_encoded: "ERP Encoded",
  denied: "Denied",
  returned: "Returned",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const format = url.searchParams.get("format"); // "csv" | "excel" | null (JSON)

  // ── Monthly breakdown ─────────────────────────────────────────────────────
  const monthlyRaw = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${cisSubmissions.createdAt})::int`,
      total: count(),
      erp_encoded: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
      denied: count(sql`CASE WHEN ${cisSubmissions.status} = 'denied' THEN 1 END`),
    })
    .from(cisSubmissions)
    .where(sql`EXTRACT(YEAR FROM ${cisSubmissions.createdAt}) = ${year}`)
    .groupBy(sql`EXTRACT(MONTH FROM ${cisSubmissions.createdAt})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${cisSubmissions.createdAt})`);

  const monthlyMap = new Map(monthlyRaw.map((r) => [r.month, r]));
  const monthly = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const row = monthlyMap.get(m);
    return {
      month: m,
      label,
      total: Number(row?.total ?? 0),
      erp_encoded: Number(row?.erp_encoded ?? 0),
      denied: Number(row?.denied ?? 0),
    };
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const [summaryRow] = await db
    .select({
      totalAll: count(),
      erpEncoded: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
      denied: count(sql`CASE WHEN ${cisSubmissions.status} = 'denied' THEN 1 END`),
      inPipeline: count(sql`CASE WHEN ${cisSubmissions.status} NOT IN ('erp_encoded','denied','draft') THEN 1 END`),
      draft: count(sql`CASE WHEN ${cisSubmissions.status} = 'draft' THEN 1 END`),
    })
    .from(cisSubmissions)
    .where(sql`EXTRACT(YEAR FROM ${cisSubmissions.createdAt}) = ${year}`);

  // ── By customer type ──────────────────────────────────────────────────────
  const byTypeRaw = await db
    .select({
      customerType: cisSubmissions.customerType,
      count: count(),
    })
    .from(cisSubmissions)
    .where(sql`EXTRACT(YEAR FROM ${cisSubmissions.createdAt}) = ${year}`)
    .groupBy(cisSubmissions.customerType)
    .orderBy(desc(count()));

  const byCustomerType = byTypeRaw
    .filter((r) => r.customerType != null)
    .map((r) => ({
      type: r.customerType!,
      label: CUSTOMER_TYPE_LABELS[r.customerType!] ?? r.customerType ?? "Unknown",
      count: Number(r.count),
    }));

  // ── By status ─────────────────────────────────────────────────────────────
  const byStatusRaw = await db
    .select({
      status: cisSubmissions.status,
      count: count(),
    })
    .from(cisSubmissions)
    .where(sql`EXTRACT(YEAR FROM ${cisSubmissions.createdAt}) = ${year}`)
    .groupBy(cisSubmissions.status)
    .orderBy(desc(count()));

  const byStatus = byStatusRaw.map((r) => ({
    status: r.status,
    label: STATUS_LABELS[r.status] ?? r.status,
    count: Number(r.count),
  }));

  // ── Top agents ────────────────────────────────────────────────────────────
  const topAgentsRaw = await db
    .select({
      agentId: cisSubmissions.agentId,
      agentCode: cisSubmissions.agentCode,
      total: count(),
      erp_encoded: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
    })
    .from(cisSubmissions)
    .where(sql`EXTRACT(YEAR FROM ${cisSubmissions.createdAt}) = ${year}`)
    .groupBy(cisSubmissions.agentId, cisSubmissions.agentCode)
    .orderBy(desc(count()))
    .limit(15);

  const agentIds = topAgentsRaw.map((r) => r.agentId).filter(Boolean) as string[];
  const agentNames = agentIds.length > 0
    ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, agentIds))
    : [];
  const nameMap = new Map(agentNames.map((u) => [u.id, u.fullName]));

  const topAgents = topAgentsRaw.map((r) => ({
    agentId: r.agentId,
    agentCode: r.agentCode ?? "—",
    agentName: nameMap.get(r.agentId ?? "") ?? "Unknown",
    total: Number(r.total),
    erp_encoded: Number(r.erp_encoded),
  }));

  // ── Export formats ────────────────────────────────────────────────────────
  const generatedAt = new Date();
  const ts = generatedAt.toISOString().slice(0, 10);
  const baseName = `cis-analytics-${year}-${ts}`;

  if (format === "csv") {
    const lines: string[] = [
      `# CIS Analytics Report — ${year}`,
      `# Generated: ${fmtDateTime(generatedAt)}`,
      `# Total submissions: ${Number(summaryRow?.totalAll ?? 0)}`,
      "",
      "## Monthly Breakdown",
      "Month,Total Submissions,ERP Encoded (Onboarded),Denied",
      ...monthly.map((m) => `${m.label},${m.total},${m.erp_encoded},${m.denied}`),
      "",
      "## By Customer Type",
      "Customer Type,Count",
      ...byCustomerType.map((r) => `${r.label},${r.count}`),
      "",
      "## By Status",
      "Status,Count",
      ...byStatus.map((r) => `${r.label},${r.count}`),
      "",
      "## Top Agents",
      "Agent Code,Agent Name,Total Submissions,ERP Encoded",
      ...topAgents.map((r) => `${r.agentCode},${r.agentName},${r.total},${r.erp_encoded}`),
    ];
    const bom = "﻿";
    return new NextResponse(bom + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  if (format === "excel") {
    const wb = XLSX.utils.book_new();

    // Monthly sheet
    const monthlySheet = XLSX.utils.aoa_to_sheet([
      [`CIS Analytics Report — ${year}`],
      [`Generated: ${fmtDateTime(generatedAt)}`],
      [],
      ["Month", "Total Submissions", "ERP Encoded (Onboarded)", "Denied"],
      ...monthly.map((m) => [m.label, m.total, m.erp_encoded, m.denied]),
    ]);
    monthlySheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 24 }, { wch: 10 }];
    monthlySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly");

    // Customer type sheet
    const typeSheet = XLSX.utils.aoa_to_sheet([
      ["Customer Type", "Count"],
      ...byCustomerType.map((r) => [r.label, r.count]),
    ]);
    typeSheet["!cols"] = [{ wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, typeSheet, "By Customer Type");

    // Status sheet
    const statusSheet = XLSX.utils.aoa_to_sheet([
      ["Status", "Count"],
      ...byStatus.map((r) => [r.label, r.count]),
    ]);
    statusSheet["!cols"] = [{ wch: 28 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, statusSheet, "By Status");

    // Top agents sheet
    const agentSheet = XLSX.utils.aoa_to_sheet([
      ["Agent Code", "Agent Name", "Total Submissions", "ERP Encoded"],
      ...topAgents.map((r) => [r.agentCode, r.agentName, r.total, r.erp_encoded]),
    ]);
    agentSheet["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, agentSheet, "Top Agents");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  // ── JSON ──────────────────────────────────────────────────────────────────
  return NextResponse.json({
    year,
    summary: {
      totalAll: Number(summaryRow?.totalAll ?? 0),
      erpEncoded: Number(summaryRow?.erpEncoded ?? 0),
      inPipeline: Number(summaryRow?.inPipeline ?? 0),
      denied: Number(summaryRow?.denied ?? 0),
      draft: Number(summaryRow?.draft ?? 0),
    },
    monthly,
    byCustomerType,
    byStatus,
    topAgents,
  });
}
