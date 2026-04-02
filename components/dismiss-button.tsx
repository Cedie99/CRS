"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";

export function DismissButton({ cisId }: { cisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDismiss() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cis/${cisId}/archive`, { method: "PATCH" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Archive failed");
      }
      toast.success("Dismissed from active view");
      router.push("/agent");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDismiss}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-50 transition-colors"
    >
      <EyeOff className="h-3.5 w-3.5" />
      {loading ? "Archiving" : "Archive"}
    </button>
  );
}
