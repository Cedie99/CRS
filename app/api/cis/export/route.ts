import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, inArray, lte, ne, or } from "drizzle-orm";
import * as XLSX from "xlsx";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
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
  pending_erp_encoding: "Pending ERP Encoding",
  erp_encoded: "ERP Encoded",
  denied: "Denied",
  returned: "Returned",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function normalizeFormat(raw: string | null): Format {
  if (raw === "excel" || raw === "pdf") return raw;
  return "csv";
}

function normalizeScope(raw: string | null): Scope {
  switch (raw) {
    case "agent": case "manager": case "approver":
    case "finance": case "legal": case "support": case "admin":
      return raw;
    default: return "agent";
  }
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── PDF builder ─────────────────────────────────────────────────────────────

const PW = 842;   // page width  (A4 landscape)
const PH = 595;   // page height
const MX = 28;    // horizontal margin
const TW = PW - MX * 2; // table width = 786

// colors
const C_GREEN      = rgb(0.133, 0.369, 0.082);   // #226015
const C_GREEN_HEAD = rgb(0.180, 0.447, 0.122);   // #2e7220
const C_WHITE      = rgb(1, 1, 1);
const C_STRIPE     = rgb(0.965, 0.973, 0.965);   // #f6f8f6
const C_BORDER     = rgb(0.827, 0.843, 0.827);   // #d3d7d3
const C_DARK       = rgb(0.094, 0.094, 0.094);
const C_MID        = rgb(0.380, 0.380, 0.380);
const C_MUTED      = rgb(0.580, 0.580, 0.580);

interface ColDef { label: string; x: number; w: number; align: "left" | "right" | "center" }

const PDF_COLS: ColDef[] = [
  { label: "#",              x: MX,        w: 28,  align: "right"  },
  { label: "Trade Name",     x: MX + 28,   w: 205, align: "left"   },
  { label: "Contact Person", x: MX + 233,  w: 145, align: "left"   },
  { label: "Customer Type",  x: MX + 378,  w: 95,  align: "left"   },
  { label: "Status",         x: MX + 473,  w: 145, align: "left"   },
  { label: "Agent Code",     x: MX + 618,  w: 72,  align: "center" },
  { label: "Submitted",      x: MX + 690,  w: 96,  align: "left"   },
  // right edge: 28 + 690 + 96 = 814 ✓ (matches PAGE_W - MX)
];

const TH_H = 22;   // table header row height
const ROW_H = 17;  // data row height
const FONT_S = 7.5; // data font size
const HEAD_S = 8;   // column header font size

function clamp(text: string, font: PDFFont, maxW: number, size: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  while (text.length > 1 && font.widthOfTextAtSize(text + "…", size) > maxW) {
    text = text.slice(0, -1);
  }
  return text + "…";
}

function cellTextX(col: ColDef, text: string, font: PDFFont, size: number): number {
  const pad = 4;
  if (col.align === "right") return col.x + col.w - pad - font.widthOfTextAtSize(text, size);
  if (col.align === "center") return col.x + (col.w - font.widthOfTextAtSize(text, size)) / 2;
  return col.x + pad;
}

// Convert top-down Y to pdf-lib bottom-up Y
function py(topDownY: number): number { return PH - topDownY; }

function drawHRule(page: PDFPage, topDownY: number) {
  page.drawLine({
    start: { x: MX, y: py(topDownY) },
    end: { x: PW - MX, y: py(topDownY) },
    thickness: 0.4,
    color: C_BORDER,
  });
}

function drawTableHeader(page: PDFPage, topDownY: number, boldFont: PDFFont) {
  // Header background
  page.drawRectangle({ x: MX, y: py(topDownY + TH_H), width: TW, height: TH_H, color: C_GREEN_HEAD });
  // Column labels
  for (const col of PDF_COLS) {
    const label = clamp(col.label, boldFont, col.w - 6, HEAD_S);
    const tx = cellTextX(col, label, boldFont, HEAD_S);
    const ty = py(topDownY + TH_H - (TH_H - HEAD_S) / 2 - HEAD_S * 0.2);
    page.drawText(label, { x: tx, y: ty, size: HEAD_S, font: boldFont, color: C_WHITE });
  }
  // Bottom border of header
  drawHRule(page, topDownY + TH_H);
}

function drawDataRow(
  page: PDFPage,
  topDownY: number,
  cells: string[],
  rowIdx: number,
  font: PDFFont,
) {
  const bg = rowIdx % 2 === 0 ? C_WHITE : C_STRIPE;
  page.drawRectangle({ x: MX, y: py(topDownY + ROW_H), width: TW, height: ROW_H, color: bg });
  const ty = py(topDownY + ROW_H - (ROW_H - FONT_S) / 2 - FONT_S * 0.2);
  for (let i = 0; i < PDF_COLS.length; i++) {
    const col = PDF_COLS[i];
    const raw = cells[i] ?? "";
    const text = clamp(raw, font, col.w - 8, FONT_S);
    const tx = cellTextX(col, text, font, FONT_S);
    const color = i === 0 ? C_MUTED : i === 4 ? C_MID : C_DARK;
    page.drawText(text, { x: tx, y: ty, size: FONT_S, font, color });
  }
  drawHRule(page, topDownY + ROW_H);
}

function drawFooter(page: PDFPage, pageNum: number, totalPages: number, font: PDFFont, generatedAt: string) {
  const y = py(PH - 16);
  page.drawLine({
    start: { x: MX, y: y + 10 },
    end: { x: PW - MX, y: y + 10 },
    thickness: 0.5,
    color: C_BORDER,
  });
  page.drawText(`Page ${pageNum} of ${totalPages}`, { x: MX, y, size: 7, font, color: C_MUTED });
  const rightText = `Generated: ${generatedAt}`;
  const rw = font.widthOfTextAtSize(rightText, 7);
  page.drawText(rightText, { x: PW - MX - rw, y, size: 7, font, color: C_MUTED });
}

async function buildPdf(
  rows: { no: string; tradeName: string; contactPerson: string; customerType: string; status: string; agentCode: string; createdAt: string }[],
  meta: { scope: string; generatedAt: Date; dateFrom?: string; dateTo?: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const genStr = fmtDateTime(meta.generatedAt);
  const periodStr = meta.dateFrom || meta.dateTo
    ? `${meta.dateFrom ? fmtDate(new Date(meta.dateFrom)) : "All time"} – ${meta.dateTo ? fmtDate(new Date(meta.dateTo)) : "Present"}`
    : "All time";

  // Pre-calculate pagination
  // Page 1: header (48) + meta (38) + gap (8) + TH = 94 top used
  // Page 2+: mini banner (24) + gap (4) + TH = 28 top used
  const PAGE1_TABLE_TOP = 94;   // top-down Y where table header starts
  const PAGEN_TABLE_TOP = 28;
  const FOOTER_HEIGHT = 22;
  const rows1 = Math.max(1, Math.floor((PH - PAGE1_TABLE_TOP - TH_H - FOOTER_HEIGHT) / ROW_H));
  const rowsN = Math.max(1, Math.floor((PH - PAGEN_TABLE_TOP - TH_H - FOOTER_HEIGHT) / ROW_H));
  const totalPages = rows.length === 0 ? 1
    : rows.length <= rows1 ? 1
    : 1 + Math.ceil((rows.length - rows1) / rowsN);

  let rowIdx = 0;
  let pageNum = 0;
  let page!: PDFPage;
  let tableDataY!: number;

  function newPage(isFirst: boolean) {
    pageNum++;
    page = pdf.addPage([PW, PH]);

    if (isFirst) {
      // ── Full banner (direct pdf-lib bottom-up y) ──
      // Banner occupies pdf-lib y: 535–587  (top-down: 8–60, 52pt tall)
      const BAND_BOT = 535;
      const BAND_H = 52;

      page.drawRectangle({ x: MX, y: BAND_BOT, width: TW, height: BAND_H, color: C_GREEN });

      // Title — baseline 34pt above band bottom (pdf-lib y=569)
      const TITLE_Y = BAND_BOT + 34;
      const titleText = "CIS EXPORT REPORT";
      const titleW = boldFont.widthOfTextAtSize(titleText, 13);
      page.drawText(titleText, { x: MX + 12, y: TITLE_Y, size: 13, font: boldFont, color: C_WHITE });

      // Scope badge — inline with title, 12pt tall
      const scopeLabel = meta.scope.toUpperCase();
      const badgeTxtW = boldFont.widthOfTextAtSize(scopeLabel, 7);
      const BADGE_PAD = 5;
      const BADGE_H = 12;
      const badgeX = MX + 12 + titleW + 8;
      const badgeY = TITLE_Y - 1;           // badge bottom 1pt below title baseline
      page.drawRectangle({ x: badgeX, y: badgeY, width: badgeTxtW + BADGE_PAD * 2, height: BADGE_H, color: C_GREEN_HEAD });
      page.drawText(scopeLabel, { x: badgeX + BADGE_PAD, y: badgeY + 3, size: 7, font: boldFont, color: C_WHITE });

      // Subtitle — 13pt above band bottom (pdf-lib y=548), clearly inside banner
      page.drawText("Customer Information System", {
        x: MX + 12, y: BAND_BOT + 13,
        size: 7.5, font, color: rgb(0.75, 0.88, 0.70),
      });

      // Company name — right-aligned, same baseline as title
      const companyText = "Oracle Petroleum";
      const companyW = boldFont.widthOfTextAtSize(companyText, 10);
      page.drawText(companyText, {
        x: PW - MX - 4 - companyW, y: TITLE_Y,
        size: 10, font: boldFont, color: rgb(0.92, 0.97, 0.90),
      });

      // Meta row 1 (pdf-lib y=521, top-down 74): Generated (left) + record count (right)
      page.drawText("Generated:", { x: MX + 4, y: 521, size: 7.5, font: boldFont, color: C_MID });
      page.drawText(genStr, {
        x: MX + 4 + boldFont.widthOfTextAtSize("Generated:", 7.5) + 4, y: 521,
        size: 7.5, font, color: C_DARK,
      });
      const recText = `${rows.length.toLocaleString()} records`;
      const recW = font.widthOfTextAtSize(recText, 7.5);
      page.drawText(recText, { x: PW - MX - recW, y: 521, size: 7.5, font: boldFont, color: C_MID });

      // Meta row 2 (pdf-lib y=507, top-down 88): Period
      page.drawText("Period:", { x: MX + 4, y: 507, size: 7.5, font: boldFont, color: C_MID });
      page.drawText(periodStr, {
        x: MX + 4 + boldFont.widthOfTextAtSize("Period:", 7.5) + 4, y: 507,
        size: 7.5, font, color: C_DARK,
      });

      // Hairline separator above table (pdf-lib y=503, top-down 92)
      page.drawLine({
        start: { x: MX, y: 503 },
        end: { x: PW - MX, y: 503 },
        thickness: 0.3,
        color: C_BORDER,
      });

      const tableHeaderTop = PAGE1_TABLE_TOP;
      drawTableHeader(page, tableHeaderTop, boldFont);
      tableDataY = tableHeaderTop + TH_H;
    } else {
      // ── Mini banner ──
      page.drawRectangle({ x: MX, y: py(PAGEN_TABLE_TOP), width: TW, height: 20, color: C_GREEN });
      page.drawText("CIS EXPORT REPORT  —  continued", { x: MX + 10, y: py(PAGEN_TABLE_TOP - 13), size: 8, font: boldFont, color: C_WHITE });
      const pgText = `Page ${pageNum} of ${totalPages}`;
      const pgW = font.widthOfTextAtSize(pgText, 8);
      page.drawText(pgText, { x: PW - MX - pgW, y: py(PAGEN_TABLE_TOP - 13), size: 8, font, color: C_WHITE });

      drawTableHeader(page, PAGEN_TABLE_TOP, boldFont);
      tableDataY = PAGEN_TABLE_TOP + TH_H;
    }
  }

  function addRow(cells: string[], dataRowIdx: number) {
    drawDataRow(page, tableDataY, cells, dataRowIdx, font);
    tableDataY += ROW_H;
  }

  // ── Render rows ──
  if (rows.length === 0) {
    newPage(true);
    page.drawText("No records found for the selected criteria.", {
      x: MX + 10, y: py(tableDataY + ROW_H + 10), size: 9, font, color: C_MUTED,
    });
  } else {
    newPage(true);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const cells = [r.no, r.tradeName, r.contactPerson, r.customerType, r.status, r.agentCode, r.createdAt];

      // Check if we need a new page
      const isFirstPage = pageNum === 1;
      const rowsOnThisPage = isFirstPage ? rows1 : rowsN;
      const rowsDrawnOnPage = Math.floor((tableDataY - (isFirstPage ? PAGE1_TABLE_TOP + TH_H : PAGEN_TABLE_TOP + TH_H)) / ROW_H);
      if (rowsDrawnOnPage >= rowsOnThisPage) {
        newPage(false);
      }

      addRow(cells, i);
    }
  }

  // ── Footers on all pages ──
  const allPages = pdf.getPages();
  for (let p = 0; p < allPages.length; p++) {
    drawFooter(allPages[p], p + 1, allPages.length, font, genStr);
  }

  return pdf.save();
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
  const dateFrom = (url.searchParams.get("dateFrom") ?? "").trim();
  const dateTo = (url.searchParams.get("dateTo") ?? "").trim();

  const conditions: any[] = [];

  if (q) {
    conditions.push(or(
      ilike(cisSubmissions.tradeName, `%${q}%`),
      ilike(cisSubmissions.contactPerson, `%${q}%`),
    ));
  }

  if (scope === "agent") {
    conditions.push(eq(cisSubmissions.agentId, session.user.id));
    conditions.push(archived ? eq(cisSubmissions.isArchived, true) : ne(cisSubmissions.isArchived, true));
    if (status) conditions.push(eq(cisSubmissions.status, status as any));
  }

  if (scope === "manager") {
    const teamAgents = await db.select({ id: users.id }).from(users).where(eq(users.managerId, session.user.id));
    const teamAgentIds = teamAgents.map((a) => a.id);
    if (teamAgentIds.length === 0) return NextResponse.json({ error: "No agents assigned" }, { status: 422 });
    conditions.push(inArray(cisSubmissions.agentId, teamAgentIds));
    conditions.push(ne(cisSubmissions.status, "pending_endorsement"));
    if (agentId && teamAgentIds.includes(agentId)) conditions.push(eq(cisSubmissions.agentId, agentId));
    if (status) conditions.push(eq(cisSubmissions.status, status as any));
  }

  if (scope === "approver") conditions.push(eq(cisSubmissions.status, "pending_approval"));
  if (scope === "finance")  conditions.push(eq(cisSubmissions.status, "pending_finance_review"));
  if (scope === "legal")    conditions.push(eq(cisSubmissions.status, "pending_legal_review"));
  if (scope === "support")  conditions.push(inArray(cisSubmissions.status, ["approved", "erp_encoded", "denied"]));

  if (scope === "admin") {
    if (status) conditions.push(eq(cisSubmissions.status, status as any));
    if (dateFrom) conditions.push(gte(cisSubmissions.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(cisSubmissions.createdAt, end));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db
    .select({ id: cisSubmissions.id, tradeName: cisSubmissions.tradeName, contactPerson: cisSubmissions.contactPerson, customerType: cisSubmissions.customerType, status: cisSubmissions.status, agentCode: cisSubmissions.agentCode, createdAt: cisSubmissions.createdAt, updatedAt: cisSubmissions.updatedAt })
    .from(cisSubmissions)
    .orderBy(desc(cisSubmissions.createdAt))
    .limit(EXPORT_LIMIT);

  const rows = whereClause ? await query.where(whereClause) : await query;

  // ── Preview mode (JSON) ───────────────────────────────────────────────────
  if (url.searchParams.get("preview") === "1") {
    return NextResponse.json({
      rows: rows.slice(0, 20).map((r, i) => ({
        no: i + 1,
        tradeName: r.tradeName ?? "—",
        contactPerson: r.contactPerson ?? "—",
        customerType: r.customerType ?? "end_user",
        status: r.status,
        agentCode: r.agentCode ?? "—",
        createdAt: fmtDate(r.createdAt),
        updatedAt: fmtDate(r.updatedAt),
      })),
      total: rows.length,
    });
  }

  const generatedAt = new Date();
  const ts = generatedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const baseName = `cis-report-${scope}-${ts}`;

  const periodStr = dateFrom || dateTo
    ? `${dateFrom ? fmtDate(new Date(dateFrom)) : "All time"} to ${dateTo ? fmtDate(new Date(dateTo)) : "Present"}`
    : "All time";

  // ── CSV ──────────────────────────────────────────────────────────────────
  if (format === "csv") {
    const headers = ["#", "Trade / Business Name", "Contact Person", "Customer Type", "Status", "Agent Code", "Date Submitted", "Last Updated"];
    const lines = [
      `# CIS Export Report — ${scope.toUpperCase()}`,
      `# Generated: ${fmtDateTime(generatedAt)}`,
      `# Period: ${periodStr}`,
      `# Total records: ${rows.length}`,
      "",
      headers.join(","),
      ...rows.map((r, i) => {
        const ct = r.customerType ?? "end_user";
        return [
          i + 1,
          r.tradeName ?? "",
          r.contactPerson ?? "",
          CUSTOMER_TYPE_LABELS[ct] ?? humanizeDisplayValue(ct),
          STATUS_LABELS[r.status] ?? humanizeDisplayValue(r.status),
          r.agentCode ?? "",
          fmtDate(r.createdAt),
          fmtDate(r.updatedAt),
        ].map(escapeCsv).join(",");
      }),
    ];
    // UTF-8 BOM so Excel opens it correctly
    const bom = "﻿";
    return new NextResponse(bom + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  if (format === "excel") {
    const wb = XLSX.utils.book_new();

    // Build sheet data: metadata rows + header row + data rows
    const sheetData: (string | number)[][] = [
      ["CIS EXPORT REPORT"],
      [`Scope: ${scope.toUpperCase()}`],
      [`Generated: ${fmtDateTime(generatedAt)}`],
      [`Period: ${periodStr}`],
      [`Total Records: ${rows.length}`],
      [],  // spacer
      ["#", "Trade / Business Name", "Contact Person", "Customer Type", "Status", "Agent Code", "Date Submitted", "Last Updated"],
      ...rows.map((r, i) => {
        const ct = r.customerType ?? "end_user";
        return [
          i + 1,
          r.tradeName ?? "",
          r.contactPerson ?? "",
          CUSTOMER_TYPE_LABELS[ct] ?? humanizeDisplayValue(ct),
          STATUS_LABELS[r.status] ?? humanizeDisplayValue(r.status),
          r.agentCode ?? "",
          fmtDate(r.createdAt),
          fmtDate(r.updatedAt),
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [
      { wch: 5  },  // #
      { wch: 35 },  // Trade Name
      { wch: 24 },  // Contact Person
      { wch: 16 },  // Customer Type
      { wch: 24 },  // Status
      { wch: 13 },  // Agent Code
      { wch: 18 },  // Date Submitted
      { wch: 18 },  // Last Updated
    ];

    // Merge title cell across all columns
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

    // Freeze at row 8 (data header row is row index 6, data starts at 7)
    ws["!freeze"] = { xSplit: 0, ySplit: 7 };

    XLSX.utils.book_append_sheet(wb, ws, "CIS Data");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  const pdfRows = rows.map((r, i) => {
    const ct = r.customerType ?? "end_user";
    return {
      no: String(i + 1),
      tradeName: r.tradeName ?? "—",
      contactPerson: r.contactPerson ?? "—",
      customerType: CUSTOMER_TYPE_LABELS[ct] ?? humanizeDisplayValue(ct),
      status: STATUS_LABELS[r.status] ?? humanizeDisplayValue(r.status),
      agentCode: r.agentCode ?? "—",
      createdAt: fmtDate(r.createdAt),
    };
  });

  const bytes = await buildPdf(pdfRows, { scope, generatedAt, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  return new NextResponse(bytes as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
    },
  });
}
