"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type PageImage = { dataUrl: string; width: number; height: number };

export function PdfPrintRenderer({ url, name }: { url: string; name: string }) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        const rendered: PageImage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({
            dataUrl: canvas.toDataURL("image/png"),
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (!cancelled) setPages(rendered);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <p className="mt-1 text-[10px] text-red-500">
        Failed to render PDF: {name}
      </p>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400 print:hidden">
        <Loader2 className="h-3 w-3 animate-spin" />
        Rendering PDF for print…
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {pages.map((pg, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={pg.dataUrl}
          alt={`${name} – page ${i + 1}`}
          width={pg.width}
          height={pg.height}
          className="w-full border border-zinc-200"
        />
      ))}
    </div>
  );
}
