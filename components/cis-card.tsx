import Link from "next/link";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { formatDistanceToNow } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, User, Clock } from "lucide-react";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

interface CisCardProps {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string;
  agentCode: string;
  agentName?: string;
  status: CisStatus;
  createdAt: Date;
  href: string;
}

export function CisCard({
  id,
  tradeName,
  contactPerson,
  customerType,
  agentCode,
  agentName,
  status,
  createdAt,
  href,
}: CisCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-mono">{agentCode}</span>
              {agentName && <span>· {agentName}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
              </span>
              <StatusBadge status={status} />
            </div>
          </div>
          <p className="mt-1 font-semibold text-zinc-900">
            {tradeName ?? "—"}
          </p>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-zinc-500">
              <User className="h-3.5 w-3.5" />
              {contactPerson ?? "—"}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
