import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { DOC_SLOTS } from "@/lib/doc-types";
import type { FileEntry } from "@/lib/doc-types";

function slugify(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

async function fetchFile(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    // owners/officers/tradeReferences/bankReferences arrays
    return val
      .map((item) =>
        typeof item === "object" && item !== null
          ? Object.entries(item as Record<string, unknown>)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : String(item)
      )
      .join("\n    ");
  }
  return String(val);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [cis] = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const zip = new JSZip();
  const tradeName = sanitizeFilename(cis.tradeName?.trim() || "Unknown");
  const rootFolder = zip.folder(`${tradeName}_CIS`)!;

  // --- form-info.txt ---
  const formFields: Array<[string, unknown]> = [
    ["Trade / Business Name", cis.tradeName],
    ["Corporate Name", cis.corporateName],
    ["Contact Person", cis.contactPerson],
    ["Contact Number", cis.contactNumber],
    ["Email Address", cis.emailAddress],
    ["Business Address", cis.businessAddress],
    ["City / Municipality", cis.cityMunicipality],
    ["Business Type", cis.businessType],
    ["TIN Number", cis.tinNumber],
    ["Customer Type", cis.customerType],
    ["Agent Code", cis.agentCode],
    ["Agent Type", cis.agentType],
    ["Status", cis.status],
    ["Date of Business Registration", cis.dateOfBusinessReg],
    ["Number of Employees", cis.numberOfEmployees],
    ["Website", cis.website],
    ["Telephone Number", cis.telephoneNumber],
    ["Delivery Address", cis.deliveryAddress],
    ["Delivery Mobile", cis.deliveryMobile],
    ["Delivery Telephone", cis.deliveryTelephone],
    ["Line of Business", cis.lineOfBusiness],
    ["Business Activity", cis.businessActivity],
    ["Business Life (years)", cis.businessLife],
    ["How Long at Address (years)", cis.howLongAtAddress],
    ["Number of Branches", cis.numberOfBranches],
    ["Payment Terms", cis.paymentTerms],
    ["Sales Channel", cis.salesChannel],
    ["Additional Notes", cis.additionalNotes],
    ["Achievements", cis.achievements],
    ["Other Merits", cis.otherMerits],
    ["Owners", cis.owners],
    ["Officers", cis.officers],
    ["Trade References", cis.tradeReferences],
    ["Bank References", cis.bankReferences],
    ["Agent Account Specialist", `${cis.agentAccountSpecialistFirst ?? ""} ${cis.agentAccountSpecialistLast ?? ""}`.trim() || null],
    ["Agent Sales Specialist", cis.agentSalesSpecialist],
    ["Agent Sales Manager", cis.agentSalesManager],
    ["Finance EU", cis.financeEu],
    ["Finance DL", cis.financeDl],
    ["Finance DR", cis.financeDr],
    ["Finance Credit Terms", cis.financeCreditTerms],
    ["Finance Credit Limit", cis.financeCreditLimit],
    ["Finance Possible Points", cis.financePossiblePoints],
    ["Finance Approved Points", cis.financeApprovedPoints],
    ["Sales Support Account Type", cis.salesSupportAccountType],
    ["Sales Support Price List 1", cis.salesSupportPriceList1],
    ["Sales Support Price List 2", cis.salesSupportPriceList2],
    ["Sales Support Sales Type", cis.salesSupportSalesType],
    ["Sales Support VAT Code", cis.salesSupportVatCode],
    ["Sales Support Other Remarks", cis.salesSupportOtherRemarks],
    ["Customer Signed At", cis.customerSignedAt],
    ["Created At", cis.createdAt],
    ["Updated At", cis.updatedAt],
  ];

  const formInfoLines = [
    "CIS FORM INFORMATION",
    "=".repeat(60),
    "",
    ...formFields.map(([label, val]) => `${label}:\n  ${formatFieldValue(val)}`),
    "",
  ];
  rootFolder.file("form-info.txt", formInfoLines.join("\n"));

  // --- Documents ---
  const docFolder = rootFolder.folder("documents")!;

  for (const slot of DOC_SLOTS) {
    const files = (cis[slot.key as keyof typeof cis] as FileEntry[] | null) ?? [];
    if (!files || files.length === 0) continue;

    const folderName = slugify(slot.label);
    const slotFolder = docFolder.folder(folderName)!;

    for (const file of files) {
      if (!file.url) continue;
      const data = await fetchFile(file.url);
      if (!data) continue;
      slotFolder.file(sanitizeFilename(file.name), data);
    }
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const zipBuffer = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength) as ArrayBuffer;

  const filename = `${tradeName}_CIS.zip`;

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBytes.byteLength),
    },
  });
}
