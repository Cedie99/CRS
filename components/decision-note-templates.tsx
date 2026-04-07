"use client";

import { Button } from "@/components/ui/button";

type TemplateType =
  | "manager_forward_note"
  | "manager_return_reason"
  | "legal_forward_note"
  | "legal_deny_reason"
  | "finance_forward_note"
  | "finance_deny_reason"
  | "approver_approve_note"
  | "approver_deny_reason";

const TEMPLATES: Record<TemplateType, string[]> = {
  manager_forward_note: [
    "Manager review completed. Submission is endorsed and ready for Finance evaluation.",
    "All manager checks are complete. Forwarding to Finance for credit assessment.",
    "Submission is validated at manager level and endorsed to Finance.",
  ],
  manager_return_reason: [
    "Please complete all required fields and recheck contact details before resubmission.",
    "Please upload clearer and complete supporting documents for manager review.",
    "Please correct data inconsistencies noted during manager review.",
  ],
  legal_forward_note: [
    "Legal review completed with no adverse findings. Forwarding to Finance.",
    "Compliance documents validated. Proceeding to next workflow stage.",
    "All required legal documents are acceptable for further processing.",
  ],
  legal_deny_reason: [
    "Legal compliance requirements were not satisfied based on submitted documentation.",
    "Provided legal documents are invalid, inconsistent, or insufficient for approval.",
    "Submission failed legal due diligence and cannot proceed further.",
  ],
  finance_forward_note: [
    "Finance evaluation completed. Customer is recommended for final approval.",
    "Credit checks passed based on submitted financial documents.",
    "Financial assessment is acceptable and ready for approver decision.",
  ],
  finance_deny_reason: [
    "Financial review indicates credit risk beyond acceptable threshold.",
    "Submitted financial documents are insufficient for a positive credit decision.",
    "Customer did not meet finance approval criteria for onboarding.",
  ],
  approver_approve_note: [
    "Final approval granted. Submission is cleared for ERP onboarding.",
    "Approved at final review stage. Proceed with customer onboarding.",
    "Senior approver review completed. Customer is fully approved.",
  ],
  approver_deny_reason: [
    "Final review identified unresolved risks; submission is denied.",
    "Submission does not satisfy final approval requirements at approver stage.",
    "Denied after final approver review due to policy non-compliance.",
  ],
};

interface DecisionNoteTemplatesProps {
  type: TemplateType;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function DecisionNoteTemplates({ type, onSelect, disabled }: DecisionNoteTemplatesProps) {
  const templates = TEMPLATES[type];

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-zinc-500">Quick templates</p>
      <div className="grid gap-1.5">
        {templates.map((template) => (
          <Button
            key={template}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSelect(template)}
            className="h-auto w-full justify-start whitespace-normal wrap-break-word px-3 py-2 text-left text-xs leading-snug"
            title={template}
          >
            {template}
          </Button>
        ))}
      </div>
    </div>
  );
}
