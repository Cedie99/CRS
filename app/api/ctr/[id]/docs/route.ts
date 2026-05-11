import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions } from "@/lib/db/schema";
import { sortFilesByUploadedAtDesc, type FileEntry } from "@/lib/doc-types";
import { put } from "@vercel/blob";

const CTR_DOC_KEYS = [
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

type CtrDocKey = (typeof CTR_DOC_KEYS)[number];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// POST /api/ctr/[id]/docs — upload a document to a CTR
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

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      docValidId: ctrSubmissions.docValidId,
      docMayorsPermit: ctrSubmissions.docMayorsPermit,
      docSecDti: ctrSubmissions.docSecDti,
      docBirCertificate: ctrSubmissions.docBirCertificate,
      docLocationMap: ctrSubmissions.docLocationMap,
      docFinancialStatement: ctrSubmissions.docFinancialStatement,
      docBankStatement: ctrSubmissions.docBankStatement,
      docProofOfBilling: ctrSubmissions.docProofOfBilling,
      docLeaseContract: ctrSubmissions.docLeaseContract,
      docProofOfOwnership: ctrSubmissions.docProofOfOwnership,
      docStorePhoto: ctrSubmissions.docStorePhoto,
      docSupplierInvoice: ctrSubmissions.docSupplierInvoice,
      docSocialMedia: ctrSubmissions.docSocialMedia,
      docCompanyWebsite: ctrSubmissions.docCompanyWebsite,
      docIsoCertification: ctrSubmissions.docIsoCertification,
      docHalalCertificate: ctrSubmissions.docHalalCertificate,
      docOther: ctrSubmissions.docOther,
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ctr.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ctr.status !== "draft" && ctr.status !== "pending_documents") {
    return NextResponse.json(
      { error: "Documents can only be uploaded in draft or pending_documents status" },
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
    !(CTR_DOC_KEYS as readonly string[]).includes(docType)
  ) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const typedDocType = docType as CtrDocKey;

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
  const blobPath = `ctr/${ctr.id}/${typedDocType}/${Date.now()}-${safeFilename}`;
  const { url } = await put(blobPath, file, { access: "public" });

  const entry: FileEntry = {
    name: file.name,
    url,
    size: bytes.byteLength,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  const existing = ((ctr as Record<string, unknown>)[typedDocType] as FileEntry[] | null) ?? [];
  await db
    .update(ctrSubmissions)
    .set({ [typedDocType]: sortFilesByUploadedAtDesc([...existing, entry]) })
    .where(eq(ctrSubmissions.id, ctr.id));

  return NextResponse.json(entry, { status: 201 });
}
