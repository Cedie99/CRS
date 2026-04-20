import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { sortFilesByUploadedAtDesc, type FileEntry } from "@/lib/doc-types";
import { put, del } from "@vercel/blob";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type StaffDocType = "docSirRestySigned" | "docSalesSupportOther";

const ALLOWED_ROLES_PER_DOC: Record<StaffDocType, string[]> = {
  docSirRestySigned: ["finance_reviewer", "legal_approver"],
  docSalesSupportOther: ["sales_support"],
};

async function getCis(id: string) {
  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      docSirRestySigned: cisSubmissions.docSirRestySigned,
      docSalesSupportOther: cisSubmissions.docSalesSupportOther,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);
  return cis ?? null;
}

function getDocField(cis: Awaited<ReturnType<typeof getCis>>, docType: StaffDocType): FileEntry[] {
  if (!cis) return [];
  if (docType === "docSirRestySigned") return (cis.docSirRestySigned as FileEntry[] | null) ?? [];
  return (cis.docSalesSupportOther as FileEntry[] | null) ?? [];
}

async function setDocField(cisId: string, docType: StaffDocType, files: FileEntry[]) {
  const value = files.length ? files : null;
  if (docType === "docSirRestySigned") {
    await db.update(cisSubmissions).set({ docSirRestySigned: value }).where(eq(cisSubmissions.id, cisId));
  } else {
    await db.update(cisSubmissions).set({ docSalesSupportOther: value }).where(eq(cisSubmissions.id, cisId));
  }
}

function requireStaffAuth(role: string, docType: StaffDocType): boolean {
  return ALLOWED_ROLES_PER_DOC[docType]?.includes(role) ?? false;
}

// POST — upload a staff-side document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");
  const docType = formData.get("docType") as string;

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (docType !== "docSirRestySigned" && docType !== "docSalesSupportOther") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  const typedDocType = docType as StaffDocType;

  if (!requireStaffAuth(session.user.role, typedDocType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cis = await getCis(id);
  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPEG, PNG, or WebP files allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { url } = await put(`cis/${id}/${docType}/${safeFilename}`, file, { access: "public" });

  const entry: FileEntry = {
    name: file.name,
    url,
    size: bytes.byteLength,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  const existing = getDocField(cis, typedDocType);
  await setDocField(id, typedDocType, sortFilesByUploadedAtDesc([...existing, entry]));

  return NextResponse.json(entry);
}

// PATCH — rename a staff document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { docType, url, newName } = body as { docType: string; url: string; newName: string };

  if (docType !== "docSirRestySigned" && docType !== "docSalesSupportOther") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  const typedDocType = docType as StaffDocType;

  if (!requireStaffAuth(session.user.role, typedDocType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trimmed = typeof newName === "string" ? newName.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });

  const cis = await getCis(id);
  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = getDocField(cis, typedDocType);
  const updated = existing.map((f) => (f.url === url ? { ...f, name: trimmed } : f));
  await setDocField(id, typedDocType, updated);

  return NextResponse.json({ ok: true, name: trimmed });
}

// DELETE — remove a staff document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { docType, url } = body as { docType: string; url: string };

  if (docType !== "docSirRestySigned" && docType !== "docSalesSupportOther") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  const typedDocType = docType as StaffDocType;

  if (!requireStaffAuth(session.user.role, typedDocType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cis = await getCis(id);
  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await del(url); } catch { /* already gone */ }

  const existing = getDocField(cis, typedDocType);
  const updated = existing.filter((f) => f.url !== url);
  await setDocField(id, typedDocType, updated);

  return NextResponse.json({ ok: true });
}
