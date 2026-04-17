import { ArrowRight, Inbox, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

interface RoleInfo {
  label: string;
  description: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const ROLES: Record<string, RoleInfo> = {
  customer: {
    label: "Customer",
    description: "Filling out the business information form",
    dotColor: "bg-zinc-400",
    bgColor: "bg-zinc-50",
    textColor: "text-zinc-700",
    borderColor: "border-zinc-200",
  },
  sales_agent: {
    label: "Sales Agent",
    description: "Completing the agent fill-out section",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  sales_manager: {
    label: "Sales Manager",
    description: "Notified for monitoring",
    dotColor: "bg-amber-400",
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
  },
  legal_approver: {
    label: "Legal Approver (Maam Cha)",
    description: "Credit evaluation for dealer accounts",
    dotColor: "bg-purple-400",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",
  },
  finance_reviewer: {
    label: "Finance Reviewer (Maam Nida)",
    description: "Credit evaluation",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  senior_approver: {
    label: "Senior Approver (Sir Ed)",
    description: "Final approval decision",
    dotColor: "bg-orange-400",
    bgColor: "bg-orange-50",
    textColor: "text-orange-800",
    borderColor: "border-orange-200",
  },
  sales_support: {
    label: "Sales Support",
    description: "Fill-out before ERP encoding",
    dotColor: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  project_development_specialist: {
    label: "Project Dev Specialist",
    description: "ERP system encoding",
    dotColor: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-200",
  },
};

interface HandoffConfig {
  current: { role: string; action: string };
  next: { role: string; action: string } | null;
}

function getHandoff(status: CisStatus, customerType: string): HandoffConfig | null {
  const isDealer = customerType === "dealer";

  switch (status) {
    case "draft":
      return {
        current: { role: "customer", action: "Filling out the form via the shared link" },
        next: { role: "sales_agent", action: "Will complete agent fill-out section" },
      };
    case "submitted":
      return {
        current: { role: "sales_agent", action: "Filling out the agent section" },
        next: {
          role: isDealer ? "legal_approver" : "finance_reviewer",
          action: isDealer
            ? "Will conduct credit evaluation (Dealer account)"
            : "Will conduct credit evaluation",
        },
      };
    case "pending_endorsement":
      return {
        current: { role: "sales_manager", action: "Monitoring this submission" },
        next: { role: "finance_reviewer", action: "Will conduct a financial review" },
      };
    case "pending_legal_review":
      return {
        current: { role: "legal_approver", action: "Conducting credit evaluation (Dealer account)" },
        next: { role: "senior_approver", action: "Will make the final approval decision" },
      };
    case "pending_finance_review":
      return {
        current: { role: "finance_reviewer", action: "Conducting credit evaluation" },
        next: { role: "senior_approver", action: "Will make the final approval decision" },
      };
    case "pending_approval":
      return {
        current: { role: "senior_approver", action: "Making the final approval decision" },
        next: { role: "sales_support", action: "Will complete the sales support fill-out" },
      };
    case "approved":
      return {
        current: { role: "sales_support", action: "Completing the sales support fill-out" },
        next: { role: "project_development_specialist", action: "Will encode into ERP system" },
      };
    case "pending_erp_encoding":
      return {
        current: { role: "project_development_specialist", action: "Encoding the customer into the ERP system" },
        next: null,
      };
    default:
      return null;
  }
}

interface RolePillProps {
  roleKey: string;
  action: string;
  label: "with" | "next";
}

function RolePill({ roleKey, action, label }: RolePillProps) {
  const role = ROLES[roleKey];
  if (!role) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
        {label === "with" ? (
          <Inbox className="h-3 w-3" />
        ) : (
          <Send className="h-3 w-3" />
        )}
        {label === "with" ? "Currently with" : "Will forward to"}
      </span>
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2",
          role.bgColor,
          role.borderColor
        )}
      >
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", role.dotColor)}
        />
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold leading-tight", role.textColor)}>
            {role.label}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 leading-snug">{action}</p>
        </div>
      </div>
    </div>
  );
}

interface WorkflowHandoffProps {
  status: CisStatus;
  customerType?: string | null;
}

export function WorkflowHandoff({ status, customerType }: WorkflowHandoffProps) {
  const handoff = getHandoff(status, customerType ?? "");
  if (!handoff) return null;

  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <RolePill roleKey={handoff.current.role} action={handoff.current.action} label="with" />

        {handoff.next ? (
          <>
            <div className="flex items-center justify-center sm:mt-8 sm:shrink-0">
              <ArrowRight className="h-4 w-4 rotate-90 text-zinc-300 sm:rotate-0" />
            </div>
            <RolePill roleKey={handoff.next.role} action={handoff.next.action} label="next" />
          </>
        ) : (
          <div className="flex items-center justify-center sm:mt-8 sm:shrink-0">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Final step
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
