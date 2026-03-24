import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role:
        | "sales_agent"
        | "rsr"
        | "sales_manager"
        | "rsr_manager"
        | "finance_reviewer"
        | "legal_approver"
        | "senior_approver"
        | "sales_support"
        | "admin";
      agentCode: string | null;
      agentType: "sales_agent" | "rsr" | null;
    } & DefaultSession["user"];
  }
}
