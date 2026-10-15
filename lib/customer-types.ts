export const DASHBOARD_CUSTOMER_TYPES = [
  "dealer",
  "distributor",
  "private_label",
  "toll_blend",
  "end_user",
] as const;

export type DashboardCustomerType = (typeof DASHBOARD_CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<DashboardCustomerType, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

export const CUSTOMER_TYPE_DESCRIPTIONS: Record<DashboardCustomerType, string> = {
  dealer: "Retail and station partners",
  distributor: "Regional and wholesale accounts",
  private_label: "Private brand partnerships",
  toll_blend: "Custom blend engagements",
  end_user: "Direct business users",
};

export const CUSTOMER_TYPE_BADGE_CLASSES: Record<DashboardCustomerType, string> = {
  dealer: "bg-blue-100 text-blue-700",
  distributor: "bg-teal-100 text-teal-700",
  private_label: "bg-violet-100 text-violet-700",
  toll_blend: "bg-orange-100 text-orange-700",
  end_user: "bg-green-100 text-green-700",
};

export function isDashboardCustomerType(value: string): value is DashboardCustomerType {
  return (DASHBOARD_CUSTOMER_TYPES as readonly string[]).includes(value);
}

export function normalizeDashboardCustomerType(value?: string | null): DashboardCustomerType {
  if (value && isDashboardCustomerType(value)) {
    return value;
  }
  return "end_user";
}

// ── Customer program (Platinum / Bagani) ─────────────────────────────────────

export const CUSTOMER_PROGRAMS = ["platinum", "bagani"] as const;

export type CustomerProgram = (typeof CUSTOMER_PROGRAMS)[number];

export const CUSTOMER_PROGRAM_LABELS: Record<CustomerProgram, string> = {
  platinum: "Platinum",
  bagani: "Bagani",
};

/** Only Dealer and Distributor accounts choose a Platinum / Bagani program. */
export const PROGRAM_CUSTOMER_TYPES = ["dealer", "distributor"] as const;

export function customerTypeHasProgram(customerType: string | null | undefined): boolean {
  return !!customerType && (PROGRAM_CUSTOMER_TYPES as readonly string[]).includes(customerType);
}

export function isCustomerProgram(value: unknown): value is CustomerProgram {
  return typeof value === "string" && (CUSTOMER_PROGRAMS as readonly string[]).includes(value);
}

/** Combined label, e.g. "Bagani Distributor". Falls back to the plain type label when no program is set. */
export function formatCustomerTypeLabel(
  customerType: string | null | undefined,
  customerProgram?: string | null,
): string {
  if (!customerType) return "";
  const typeLabel = isDashboardCustomerType(customerType)
    ? CUSTOMER_TYPE_LABELS[customerType]
    : customerType.replace(/_/g, " ");
  return isCustomerProgram(customerProgram)
    ? `${CUSTOMER_PROGRAM_LABELS[customerProgram]} ${typeLabel}`
    : typeLabel;
}
