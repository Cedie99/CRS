"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCw } from "lucide-react";
import { sileo as toast } from "sileo";

interface AgentResubmitFormProps {
  cisId: string;
  returnedBy: string | null;
}

export function AgentResubmitForm({ cisId, returnedBy }: AgentResubmitFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleResubmit() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cis/${cisId}/agent-resubmit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error({
          title: "Resubmission failed",
          description: typeof json.error === "string" ? json.error : "Something went wrong.",
        });
        return;
      }

      toast.success({
        title: "Form resubmitted",
        description: returnedBy
          ? `Your form has been resubmitted to ${returnedBy} for review.`
          : "Your form has been resubmitted for review.",
      });
      router.refresh();
    } catch {
      toast.error({
        title: "Resubmission failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border border-rose-200/80 bg-linear-to-b from-rose-50/70 via-white to-white shadow-sm">
      <CardHeader className="border-b border-rose-100/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-rose-900">
              <RefreshCw className="h-4 w-4" />
              Resubmit Form
            </CardTitle>
            <p className="mt-1 text-sm text-rose-700">
              After fixing the issues, resubmit to send it back for review.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-2 border-t border-rose-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-rose-600">
            {returnedBy
              ? `This will route the form back to ${returnedBy} for review.`
              : "This will route the form back for review."}
          </p>
          <Button
            onClick={handleResubmit}
            disabled={isLoading}
            className="w-full gap-2 sm:w-auto"
          >
            <ArrowRight className="h-4 w-4" />
            {isLoading ? "Resubmitting..." : "Resubmit for Review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
