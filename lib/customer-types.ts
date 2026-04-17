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
