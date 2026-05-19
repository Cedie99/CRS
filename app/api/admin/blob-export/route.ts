import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { list } from "@vercel/blob";
import { zipSync, strToU8 } from "fflate";

export const maxDuration = 300;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Collect all blob entries
  const entries: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const { blobs, cursor: next } = await list({ cursor, limit: 100 });
    for (const b of blobs) entries.push({ pathname: b.pathname, url: b.url });
    cursor = next;
  } while (cursor);

  if (entries.length === 0) {
    return NextResponse.json({ error: "No files found" }, { status: 404 });
  }

  // Fetch all files and build zip entries
  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    entries.map(async ({ pathname, url }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const buf = await res.arrayBuffer();
        files[pathname] = new Uint8Array(buf);
      } catch (err) {
        // Include a placeholder so the file is visible in the zip
        files[pathname + ".error.txt"] = strToU8(`Failed to download: ${err}`);
      }
    })
  );

  const zip = zipSync(files, { level: 0 }); // level 0 = store only (fast)

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="crs-blob-export-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}
