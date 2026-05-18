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
  pending_selection: {
    label: "To be determined",
    description: "Depends on customer type selected by agent",
    dotColor: "bg-zinc-300",
    bgColor: "bg-zinc-50",
    textColor: "text-zinc-500",
    borderColor: "border-zinc-200",
  },
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
  rsr: {
    label: "RSR Agent",
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
    label: "Legal Approver",
    description: "Credit evaluation for dealer accounts",
    dotColor: "bg-purple-400",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",
  },
  finance_reviewer: {
    label: "Finance Reviewer",
    description: "Credit evaluation",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  senior_approver: {
    label: "Senior Approver",
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

function getHandoff(status: CisStatus, customerType: string, agentType: string): HandoffConfig | null {
  const isDealer = customerType === "dealer";
  const agentRole = agentType === "rsr" ? "rsr" : "sales_agent";

  switch (status) {
    case "draft":
      return {
        current: { role: "customer", action: "Filling out the form via the shared link" },
        next: { role: agentRole, action: "Will complete agent fill-out section" },
      };
    case "submitted":
      return {
        current: { role: agentRole, action: "Filling out the agent section" },
        next: isDealer
          ? { role: "legal_approver", action: "Will conduct credit evaluation (Dealer)" }
          : { role: "finance_reviewer", action: "Will conduct credit evaluation" },
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
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
        {label === "with" ? (
          <Inbox className="h-3.5 w-3.5" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {label === "with" ? "Currently with" : "Will forward to"}
      </span>
      <div
        className={cn(
          "inline-flex items-center gap-3 rounded-xl border-2 px-4 py-3 shadow-sm transition-all hover:shadow-md",
          role.bgColor,
          role.borderColor
        )}
      >
        <span
          className={cn("h-2.5 w-2.5 shrink-0 rounded-full shadow-sm", role.dotColor)}
        />
        <div className="min-w-0">
          <p className={cn("text-sm font-bold leading-tight", role.textColor)}>
            {role.label}
          </p>
          <p className="mt-1 text-xs text-zinc-600 leading-snug font-medium">{action}</p>
        </div>
      </div>
    </div>
  );
}

interface WorkflowHandoffProps {
  status: CisStatus;
  customerType?: string | null;
  agentType?: string | null;
}

export function WorkflowHandoff({ status, customerType, agentType }: WorkflowHandoffProps) {
  const handoff = getHandoff(status, customerType ?? "", agentType ?? "sales_agent");
  if (!handoff) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-linear-to-br from-white to-zinc-50 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <RolePill roleKey={handoff.current.role} action={handoff.current.action} label="with" />

        {handoff.next ? (
          <>
            <div className="flex items-center justify-center sm:mt-10 sm:shrink-0">
              <ArrowRight className="h-5 w-5 rotate-90 text-zinc-400 sm:rotate-0" />
            </div>
            <RolePill roleKey={handoff.next.role} action={handoff.next.action} label="next" />
          </>
        ) : (
          <div className="flex items-center justify-center sm:mt-10 sm:shrink-0">
            <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
              Final step
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
