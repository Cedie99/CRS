"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminExportButton() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("excel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function handleFormatSelect(f: "csv" | "excel" | "pdf") {
    setFormat(f);
    setOpen(true);
  }

  function handleDownload() {
    const params = new URLSearchParams({ scope: "admin", format });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.href = `/api/cis/export?${params.toString()}`;
    setOpen(false);
  }

  const formatLabels: Record<"csv" | "excel" | "pdf", string> = {
    csv: "CSV (.csv)",
    excel: "Excel (.xlsx)",
    pdf: "PDF (.pdf)",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900">
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Download as</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleFormatSelect("csv")}>CSV (.csv)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFormatSelect("excel")}>Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFormatSelect("pdf")}>PDF (.pdf)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Submissions</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              Format: <span className="font-medium text-zinc-900">{formatLabels[format]}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Date from <span className="font-normal text-zinc-400">(optional)</span></Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date to <span className="font-normal text-zinc-400">(optional)</span></Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </div>

            <p className="text-xs text-zinc-400">
              Leave both dates empty to export all submissions.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
