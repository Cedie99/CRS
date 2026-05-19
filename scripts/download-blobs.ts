import { list } from "@vercel/blob";
import { writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";

process.loadEnvFile(".env.local");

async function main() {
  const outDir = "./blob-downloads";
  mkdirSync(outDir, { recursive: true });

  let cursor: string | undefined;
  let total = 0;

  do {
    const { blobs, cursor: next } = await list({ cursor, limit: 100 });
    if (blobs.length === 0 && total === 0) {
      console.log("No files found in Vercel Blob.");
      break;
    }
    for (const blob of blobs) {
      const res = await fetch(blob.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const dest = join(outDir, basename(blob.pathname));
      writeFileSync(dest, buf);
      console.log(`✓ ${blob.pathname}`);
      total++;
    }
    cursor = next;
  } while (cursor);

  if (total > 0) console.log(`\nDone. ${total} files saved to ${outDir}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
