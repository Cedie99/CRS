"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export function DocxRenderer({ url, name }: { url: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const [{ renderAsync }, res] = await Promise.all([
          import("docx-preview"),
          fetch(url),
        ]);
        if (cancelled) return;
        const blob = await res.blob();
        if (cancelled || !containerRef.current) return;
        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-render",
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: false,
          useBase64URL: true,
        });
        if (!cancelled) setState("done");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="mt-2">
      {state === "loading" && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 print:hidden">
          <Loader2 className="h-3 w-3 animate-spin" />
          Rendering document…
        </div>
      )}
      {state === "error" && (
        <p className="text-[11px] text-red-500">Failed to render document: {name}</p>
      )}
      <div
        ref={containerRef}
        className="docx-container w-full overflow-x-auto rounded border border-zinc-200 bg-white p-4 text-sm"
      />
    </div>
  );
}
