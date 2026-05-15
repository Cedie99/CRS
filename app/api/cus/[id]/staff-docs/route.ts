import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";
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

const ALLOWED_ROLES = ["finance_reviewer", "legal_approver"];

async function getCus(id: string) {
  const [cus] = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      docSirRestySigned: cusSubmissions.docSirRestySigned,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);
  return cus ?? null;
}

function getFiles(cus: Awaited<ReturnType<typeof getCus>>): FileEntry[] {
  return (cus?.docSirRestySigned as FileEntry[] | null) ?? [];
}

async function setFiles(cusId: string, files: FileEntry[]) {
  await db
    .update(cusSubmissions)
    .set({ docSirRestySigned: files.length ? files : null })
    .where(eq(cusSubmissions.id, cusId));
}

// POST — upload CFO-signed CUS
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const cus = await getCus(id);
  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPEG, PNG, or WebP files allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { url } = await put(`cus/${id}/docSirRestySigned/${safeFilename}`, file, { access: "public" });

  const entry: FileEntry = {
    name: file.name,
    url,
    size: bytes.byteLength,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  const existing = getFiles(cus);
  await setFiles(id, sortFilesByUploadedAtDesc([...existing, entry]));

  return NextResponse.json(entry);
}

// PATCH — rename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { url, newName } = await req.json() as { url: string; newName: string };

  const trimmed = typeof newName === "string" ? newName.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });

  const cus = await getCus(id);
  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = getFiles(cus).map((f) => (f.url === url ? { ...f, name: trimmed } : f));
  await setFiles(id, updated);

  return NextResponse.json({ ok: true, name: trimmed });
}

// DELETE — remove
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { url } = await req.json() as { url: string };

  const cus = await getCus(id);
  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await del(url); } catch { /* already gone */ }

  const updated = getFiles(cus).filter((f) => f.url !== url);
  await setFiles(id, updated);

  return NextResponse.json({ ok: true });
}
