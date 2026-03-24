import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type CisStatus } from "@/components/status-badge";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-900">{value || <span className="text-zinc-400">—</span>}</p>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{tradeName ?? "—"}</CardTitle>
            <p className="mt-0.5 text-xs text-zinc-500">
              Agent{" "}
              <span className="font-mono font-medium text-zinc-700">{agentCode}</span>
              {agentType && (
                <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs">
                  {agentType === "sales_agent" ? "Sales" : "RSR"}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={status} />
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Separator />

        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Customer Information
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trade / Business name" value={tradeName} />
          <Field label="Contact person" value={contactPerson} />
          <Field label="Contact number" value={contactNumber} />
          <Field label="Email address" value={emailAddress} />
          <div className="sm:col-span-2">
            <Field label="Business address" value={businessAddress} />
          </div>
          <Field label="City / Municipality" value={cityMunicipality} />
          <Field
            label="Business type"
            value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null}
          />
          <Field label="TIN number" value={tinNumber} />
        </div>

        {additionalNotes && (
          <div className="rounded-md bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-zinc-500">Additional notes</p>
            <p className="mt-0.5 text-sm text-zinc-700 whitespace-pre-wrap">{additionalNotes}</p>
          </div>
        )}

        <Separator />

        <div className="flex gap-6 text-xs text-zinc-400">
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
