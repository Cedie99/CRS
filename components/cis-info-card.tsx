import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Hash,
  User,
  Briefcase,
  FileText,
} from "lucide-react";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  standard: "bg-zinc-100 text-zinc-600",
  fs_petroleum: "bg-purple-50 text-purple-700 border border-purple-100",
  special: "bg-amber-50 text-amber-700 border border-amber-100",
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  corporation: "Corporation",
  partnership: "Partnership",
  sole_proprietor: "Sole Proprietor",
  cooperative: "Cooperative",
  other: "Other",
};

interface CisInfoCardProps {
  tradeName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  emailAddress: string | null;
  businessAddress: string | null;
  cityMunicipality: string | null;
  businessType: string | null;
  tinNumber: string | null;
  additionalNotes: string | null;
  customerType: string;
  agentCode: string;
  agentType: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt: Date;
}

function Field({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={`text-sm text-zinc-900 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-zinc-300">—</span>}
      </p>
    </div>
  );
}

export function CisInfoCard(props: CisInfoCardProps) {
  const {
    tradeName,
    contactPerson,
    contactNumber,
    emailAddress,
    businessAddress,
    cityMunicipality,
    businessType,
    tinNumber,
    additionalNotes,
    customerType,
    agentCode,
    agentType,
    status,
    createdAt,
    updatedAt,
  } = props;

  return (
    <Card className="overflow-hidden">
      {/* Header band */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-zinc-900">
              {tradeName ?? <span className="italic text-zinc-400 font-normal">Untitled</span>}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>
                Agent{" "}
                <span className="font-mono font-semibold text-zinc-700">{agentCode}</span>
              </span>
              {agentType && (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-600">
                  {agentType === "sales_agent" ? "Sales" : "RSR"}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
            <StatusBadge status={status} />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
              }`}
            >
              <Building2 className="h-3 w-3" />
              {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-4 sm:p-6">
        {/* Customer Info section */}
        <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <User className="h-3.5 w-3.5" />
            Customer Information
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Trade / Business Name" value={tradeName} icon={Briefcase} />
            <Field label="Contact Person" value={contactPerson} icon={User} />
            <Field label="Contact Number" value={contactNumber} icon={Phone} />
            <Field label="Email Address" value={emailAddress} icon={Mail} />
            <div className="sm:col-span-2">
              <Field label="Business Address" value={businessAddress} icon={MapPin} />
            </div>
            <Field label="City / Municipality" value={cityMunicipality} icon={MapPin} />
            <Field
              label="Business Type"
              value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null}
              icon={Building2}
            />
            <Field label="TIN Number" value={tinNumber} icon={Hash} mono />
          </div>
        </div>

        {additionalNotes && (
          <>
            <Separator />
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <FileText className="h-3.5 w-3.5" />
                Additional Notes
              </p>
              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {additionalNotes}
              </p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400 sm:gap-x-8">
          <span>
            Submitted{" "}
            <span className="font-medium text-zinc-600">
              {new Date(createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </span>
          <span>
            Last updated{" "}
            <span className="font-medium text-zinc-600">
              {new Date(updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
