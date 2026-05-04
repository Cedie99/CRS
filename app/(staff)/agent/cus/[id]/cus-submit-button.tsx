"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sileo as toast } from "sileo";

export function CusSubmitButton({ cusId }: { cusId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cus/${cusId}/submit`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Customer Update Sheet submitted for review." });
      router.refresh();
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to submit." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        "Submit for Review"
      )}
    </Button>
  );
}
