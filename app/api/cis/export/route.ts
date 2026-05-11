import { NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { humanizeDisplayValue } from "@/lib/utils";

const EXPORT_LIMIT = 5000;

type Scope = "agent" | "manager" | "approver" | "finance" | "legal" | "support" | "admin";
type Format = "csv" | "excel" | "pdf";

const ROLE_SCOPES: Record<string, Scope[]> = {
  sales_agent: ["agent"],
  rsr: ["agent"],
  sales_manager: ["manager"],
  rsr_manager: ["manager"],
  finance_reviewer: ["finance"],
  legal_approver: ["legal"],
  senior_approver: ["approver"],
  sales_support: ["support"],
  admin: ["admin"],
};

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
  pending_endorsement: "Pending Endorsement",
  pending_legal_review: "Pending Legal Review",
  pending_finance_review: "Pending Finance Review",
  pending_approval: "Pending Approval",
  approved: "Approved",
  erp_encoded: "ERP Encoded",
  denied: "Denied",
  returned: "Returned",
};

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeFormat(raw: string | null): Format {
  if (raw === "excel" || raw === "pdf") return raw;
  return "csv";
}

function normalizeScope(raw: string | null): Scope {
  switch (raw) {
    case "agent":
    case "manager":
    case "approver":
    case "finance":
    case "legal":
    case "support":
    case "admin":
      return raw;
    default:
      return "agent";
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const role = String((session.user as any).role ?? "");
  const allowedScopes = ROLE_SCOPES[role] ?? [];
  if (allowedScopes.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedScope = normalizeScope(url.searchParams.get("scope"));
  const scope = allowedScopes.includes(requestedScope) ? requestedScope : allowedScopes[0];
  const format = normalizeFormat(url.searchParams.get("format"));
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const archived = url.searchParams.get("archived") === "1";
  const agentId = (url.searchParams.get("agentId") ?? "").trim();

  const conditions: any[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
    );
  }

  if (scope === "agent") {
    conditions.push(eq(cisSubmissions.agentId, session.user.id));
    conditions.push(archived ? eq(cisSubmissions.isArchived, true) : ne(cisSubmissions.isArchived, true));
    if (status) {
      conditions.push(eq(cisSubmissions.status, status as any));
    }
  }

  if (scope === "manager") {
    const teamAgents = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, session.user.id));
    const teamAgentIds = teamAgents.map((a) => a.id);
    if (teamAgentIds.length === 0) {
      return NextResponse.json({ error: "No agents assigned" }, { status: 422 });
    }

    conditions.push(inArray(cisSubmissions.agentId, teamAgentIds));
    conditions.push(ne(cisSubmissions.status, "pending_endorsement"));

    if (agentId && teamAgentIds.includes(agentId)) {
      conditions.push(eq(cisSubmissions.agentId, agentId));
    }
    if (status) {
      conditions.push(eq(cisSubmissions.status, status as any));
    }
  }

  if (scope === "approver") {
    conditions.push(eq(cisSubmissions.status, "pending_approval"));
  }

  if (scope === "finance") {
    conditions.push(eq(cisSubmissions.status, "pending_finance_review"));
  }

  if (scope === "legal") {
    conditions.push(eq(cisSubmissions.status, "pending_legal_review"));
  }

  if (scope === "support") {
    conditions.push(inArray(cisSubmissions.status, ["approved", "erp_encoded", "denied"]));
  }

  if (scope === "admin" && status) {
    conditions.push(eq(cisSubmissions.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const query = db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      agentCode: cisSubmissions.agentCode,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
    })
    .from(cisSubmissions)
    .orderBy(desc(cisSubmissions.updatedAt))
    .limit(EXPORT_LIMIT);

  const rows = whereClause ? await query.where(whereClause) : await query;

  const normalizedRows = rows.map((r) => {
    const customerType = r.customerType ?? "end_user";

    return {
      ID: r.id,
      "Trade Name": r.tradeName ?? "",
      "Contact Person": r.contactPerson ?? "",
      "Customer Type": CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType),
      Status: STATUS_LABELS[r.status] ?? humanizeDisplayValue(r.status),
      "Agent Code": r.agentCode ?? "",
      "Created At": r.createdAt.toISOString(),
      "Updated At": r.updatedAt.toISOString(),
    };
  });

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const baseName = `cis-export-${scope}-${ts}`;

  if (format === "csv") {
    const headers = [
      "ID",
      "Trade Name",
      "Contact Person",
      "Customer Type",
      "Status",
      "Agent Code",
      "Created At",
      "Updated At",
    ];
    const lines = [
      headers.join(","),
      ...normalizedRows.map((row) => headers.map((h) => escapeCsv((row as any)[h])).join(",")),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${baseName}.csv`,
      },
    });
  }

  if (format === "excel") {
    const ws = XLSX.utils.json_to_sheet(normalizedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CIS Export");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${baseName}.xlsx`,
      },
    });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([842, 595]);
  let currentPage = page;
  let y = 560;

  const drawLine = (line: string, bold = false) => {
    if (y < 30) {
      currentPage = pdf.addPage([842, 595]);
      y = 560;
    }
    currentPage.drawText(line, {
      x: 20,
      y,
      size: 9,
      font,
      color: bold ? rgb(0.1, 0.1, 0.1) : rgb(0.25, 0.25, 0.25),
    });
    y -= 14;
  };

  drawLine(`CIS Export (${scope})`, true);
  drawLine(`Generated at ${new Date().toISOString()}`);
  drawLine("");
  drawLine("ID       | Trade Name | Contact | Type | Status | Agent | Updated", true);

  for (const row of normalizedRows) {
    const line = [
      row.ID.slice(0, 8),
      row["Trade Name"].slice(0, 22),
      row["Contact Person"].slice(0, 16),
      row["Customer Type"].slice(0, 12),
      row.Status.slice(0, 16),
      row["Agent Code"].slice(0, 10),
      row["Updated At"].slice(0, 16),
    ].join(" | ");
    drawLine(line);
  }

  const bytes = await pdf.save();
  return new NextResponse(bytes as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${baseName}.pdf`,
    },
  });
}
