"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/form/${token}`
      : `/form/${token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/form/${token}`
    );
    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={link}
        className="flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-mono text-zinc-600 outline-none"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
