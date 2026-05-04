import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";
import { sortFilesByUploadedAtDesc, type FileEntry } from "@/lib/doc-types";
import { put } from "@vercel/blob";

const CUS_DOC_KEYS = [
  "docValidId",
  "docMayorsPermit",
  "docSecDti",
  "docBirCertificate",
  "docLocationMap",
  "docFinancialStatement",
  "docBankStatement",
  "docProofOfBilling",
  "docLeaseContract",
  "docProofOfOwnership",
  "docStorePhoto",
  "docSupplierInvoice",
  "docSocialMedia",
  "docCompanyWebsite",
  "docIsoCertification",
  "docHalalCertificate",
  "docOther",
] as const;

type CusDocKey = (typeof CUS_DOC_KEYS)[number];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// POST /api/cus/[id]/docs — upload a document to a CUS (append-only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cus] = await db
    .select({
      id: cusSubmissions.id,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      docValidId: cusSubmissions.docValidId,
      docMayorsPermit: cusSubmissions.docMayorsPermit,
      docSecDti: cusSubmissions.docSecDti,
      docBirCertificate: cusSubmissions.docBirCertificate,
      docLocationMap: cusSubmissions.docLocationMap,
      docFinancialStatement: cusSubmissions.docFinancialStatement,
      docBankStatement: cusSubmissions.docBankStatement,
      docProofOfBilling: cusSubmissions.docProofOfBilling,
      docLeaseContract: cusSubmissions.docLeaseContract,
      docProofOfOwnership: cusSubmissions.docProofOfOwnership,
      docStorePhoto: cusSubmissions.docStorePhoto,
      docSupplierInvoice: cusSubmissions.docSupplierInvoice,
      docSocialMedia: cusSubmissions.docSocialMedia,
      docCompanyWebsite: cusSubmissions.docCompanyWebsite,
      docIsoCertification: cusSubmissions.docIsoCertification,
      docHalalCertificate: cusSubmissions.docHalalCertificate,
      docOther: cusSubmissions.docOther,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cus.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (cus.status !== "draft") {
    return NextResponse.json(
      { error: "Documents can only be uploaded while the CUS is in draft status" },
      { status: 409 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const docType = formData.get("docType");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (
    typeof docType !== "string" ||
    !(CUS_DOC_KEYS as readonly string[]).includes(docType)
  ) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const typedDocType = docType as CusDocKey;

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, or WebP files are allowed" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobPath = `cus/${cus.id}/${typedDocType}/${Date.now()}-${safeFilename}`;
  const { url } = await put(blobPath, file, { access: "public" });

  const entry: FileEntry = {
    name: file.name,
    url,
    size: bytes.byteLength,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  const existing = ((cus as Record<string, unknown>)[typedDocType] as FileEntry[] | null) ?? [];
  await db
    .update(cusSubmissions)
    .set({ [typedDocType]: sortFilesByUploadedAtDesc([...existing, entry]) })
    .where(eq(cusSubmissions.id, cus.id));

  return NextResponse.json(entry, { status: 201 });
}
