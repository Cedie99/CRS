import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import {
  DOC_COLUMN_MAP,
  sortFilesByUploadedAtDesc,
  type DocType,
  type FileEntry,
} from "@/lib/doc-types";
import { put, del } from "@vercel/blob";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function getCis(id: string) {
  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      agentId: cisSubmissions.agentId,
      status: cisSubmissions.status,
      docValidId: cisSubmissions.docValidId,
      docMayorsPermit: cisSubmissions.docMayorsPermit,
      docSecDti: cisSubmissions.docSecDti,
      docBirCertificate: cisSubmissions.docBirCertificate,
      docLocationMap: cisSubmissions.docLocationMap,
      docFinancialStatement: cisSubmissions.docFinancialStatement,
      docBankStatement: cisSubmissions.docBankStatement,
      docProofOfBilling: cisSubmissions.docProofOfBilling,
      docLeaseContract: cisSubmissions.docLeaseContract,
      docProofOfOwnership: cisSubmissions.docProofOfOwnership,
      docStorePhoto: cisSubmissions.docStorePhoto,
      docSupplierInvoice: cisSubmissions.docSupplierInvoice,
      docSocialMedia: cisSubmissions.docSocialMedia,
      docCompanyWebsite: cisSubmissions.docCompanyWebsite,
      docCertifications: cisSubmissions.docCertifications,
      docGovCertifications: cisSubmissions.docGovCertifications,
      docOther: cisSubmissions.docOther,
      docAgentOtherRequirements: cisSubmissions.docAgentOtherRequirements,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  return cis;
}

async function requireAuthorizedUser(cisId: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { id: userId, role } = session.user;
  if (role !== "sales_agent" && role !== "rsr" && role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const cis = await getCis(cisId);
  if (!cis) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  if (role !== "admin" && cis.agentId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { cis };
}

// POST /api/cis/[id]/docs — upload a staff-side supporting document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuthorizedUser(id);
  if ("error" in authResult) return authResult.error;

  const { cis } = authResult;
  if (["denied", "erp_encoded"].includes(cis.status)) {
    return NextResponse.json({ error: "Document uploads are not allowed in this status" }, { status: 409 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const docType = formData.get("docType");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof docType !== "string" || !(docType in DOC_COLUMN_MAP)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  const typedDocType = docType as DocType;

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPEG, PNG, or WebP files allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { url } = await put(`cis/${cis.id}/${docType}/${safeFilename}`, file, { access: "public" });

  const entry: FileEntry = {
    name: file.name,
    url,
    size: bytes.byteLength,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  const colKey = DOC_COLUMN_MAP[typedDocType];
  const existing = ((cis as Record<string, unknown>)[colKey] as FileEntry[] | null) ?? [];
  await db
    .update(cisSubmissions)
    .set({ [colKey]: sortFilesByUploadedAtDesc([...existing, entry]) })
    .where(eq(cisSubmissions.id, cis.id));

  return NextResponse.json(entry);
}

// PATCH /api/cis/[id]/docs — rename an uploaded document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuthorizedUser(id);
  if ("error" in authResult) return authResult.error;

  const { cis } = authResult;

  const body = await req.json();
  const { docType, url, newName } = body as { docType: string; url: string; newName: string };

  if (!docType || !(docType in DOC_COLUMN_MAP) || !url || typeof newName !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const trimmed = newName.trim();
  if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });

  const colKey = DOC_COLUMN_MAP[docType as DocType];
  const existing = ((cis as Record<string, unknown>)[colKey] as FileEntry[] | null) ?? [];
  const updated = existing.map((f) => (f.url === url ? { ...f, name: trimmed } : f));

  await db
    .update(cisSubmissions)
    .set({ [colKey]: updated })
    .where(eq(cisSubmissions.id, cis.id));

  return NextResponse.json({ ok: true, name: trimmed });
}

// DELETE /api/cis/[id]/docs — remove a document entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuthorizedUser(id);
  if ("error" in authResult) return authResult.error;

  const { cis } = authResult;
  if (["approved", "erp_encoded"].includes(cis.status)) {
    return NextResponse.json({ error: "Document deletion is not allowed in this status" }, { status: 409 });
  }

  const body = await req.json();
  const { docType, url } = body as { docType: string; url: string };

  if (!docType || !(docType in DOC_COLUMN_MAP) || !url) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try { await del(url); } catch { /* already gone */ }

  const colKey = DOC_COLUMN_MAP[docType as DocType];
  const existing = ((cis as Record<string, unknown>)[colKey] as FileEntry[] | null) ?? [];
  const updated = existing.filter((f) => f.url !== url);

  await db
    .update(cisSubmissions)
    .set({ [colKey]: updated.length ? updated : null })
    .where(eq(cisSubmissions.id, cis.id));

  return NextResponse.json({ ok: true });
}
