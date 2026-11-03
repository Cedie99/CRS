import { zipSync } from "fflate";

export type BackupProgress = { done: number; total: number };
export type BackupMark = { lastBackupAt: string; lastBackupByName: string | null };

/** The bits of a record needed to name its PDF. */
export interface BackupTarget {
  id: string;
  tradeName: string | null;
  customerCode: string | null;
}

function safeName(value: string, fallback = "untitled") {
  const cleaned = value.replace(/[\/:*?"<>|\x00-\x1f]+/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 120);
}

function pdfFileName(target: BackupTarget) {
  const code = target.customerCode?.trim() || target.id.slice(0, 8);
  return `${safeName(`${code} - ${target.tradeName?.trim() || "Untitled"}`)}.pdf`;
}

function uniqueName(files: Record<string, Uint8Array>, name: string) {
  if (!(name in files)) return name;
  const base = name.replace(/\.pdf$/, "");
  let i = 2;
  while (`${base} (${i}).pdf` in files) i++;
  return `${base} (${i}).pdf`;
}

async function fetchCisPdf(cisId: string) {
  const res = await fetch(`/api/cis/${cisId}/pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

function saveFile(data: Uint8Array, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Records the download server-side so the Backup Records page can flag it as already backed up. */
async function markBackedUp(ids: string[]) {
  const marks: Record<string, BackupMark> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api/admin/cis/${id}/backup`, { method: "POST" });
        if (res.ok) marks[id] = await res.json();
      } catch {
        // Non-fatal — the file is already saved; the record just stays unflagged
      }
    })
  );
  return marks;
}

/**
 * Downloads the CIS form PDF for one or more ERP-encoded records.
 * A single record downloads as a .pdf; multiple records are bundled into a .zip of PDFs.
 * Returns the backup marks for the records that were actually downloaded.
 */
export async function downloadCisBackups(
  targets: BackupTarget[],
  onProgress?: (p: BackupProgress) => void
): Promise<{ failed: BackupTarget[]; marks: Record<string, BackupMark> }> {
  const files: Record<string, Uint8Array> = {};
  const failed: BackupTarget[] = [];
  const included: string[] = [];

  // PDFs are rendered server-side one at a time, so fetch sequentially
  for (let i = 0; i < targets.length; i++) {
    onProgress?.({ done: i, total: targets.length });
    try {
      files[uniqueName(files, pdfFileName(targets[i]))] = await fetchCisPdf(targets[i].id);
      included.push(targets[i].id);
    } catch {
      failed.push(targets[i]);
    }
  }
  onProgress?.({ done: targets.length, total: targets.length });

  if (included.length === 0) {
    throw new Error(
      targets.length === 1 ? "The CIS form PDF could not be generated." : "None of the selected CIS forms could be generated."
    );
  }

  if (targets.length === 1) {
    const [name] = Object.keys(files);
    saveFile(files[name], "application/pdf", name);
  } else {
    const date = new Date().toISOString().slice(0, 10);
    // Store only — PDFs are already compressed
    saveFile(zipSync(files, { level: 0 }), "application/zip", `CIS Forms - ${included.length} records - ${date}.zip`);
  }

  return { failed, marks: await markBackedUp(included) };
}
