import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { cisSubmissions, users, workflowEvents } from "@/lib/db/schema";
import { eq, and, ne, count, sql, inArray } from "drizzle-orm";

/**
 * Cached stats for agent dashboard — revalidates every 10 seconds.
 * Keyed by agentId so each agent gets their own cached stats.
 */
export const getAgentStats = unstable_cache(
  async (agentId: string) => {
    const [statsRow] = await db
      .select({
        total: count(sql`CASE WHEN ${cisSubmissions.status} != 'draft' THEN 1 END`),
        draft: count(sql`CASE WHEN ${cisSubmissions.status} = 'draft' THEN 1 END`),
        awaitingAgentCompletion: count(sql`CASE WHEN ${cisSubmissions.status} = 'submitted' THEN 1 END`),
        active: count(sql`CASE WHEN ${cisSubmissions.status} IN ('pending_endorsement','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
        completed: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
        denied: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(and(eq(cisSubmissions.agentId, agentId), ne(cisSubmissions.isArchived, true)));
    return {
      total: Number(statsRow?.total ?? 0),
      draft: Number(statsRow?.draft ?? 0),
      awaitingAgentCompletion: Number(statsRow?.awaitingAgentCompletion ?? 0),
      active: Number(statsRow?.active ?? 0),
      completed: Number(statsRow?.completed ?? 0),
      denied: Number(statsRow?.denied ?? 0),
    };
  },
  ["agent-stats"],
  { tags: ["agent-stats"] }
);

/**
 * Cached stats for manager dashboard — revalidates every 10 seconds.
 * Keyed by a stable string of agentIds.
 */
export const getManagerStats = unstable_cache(
  async (agentIds: string[]) => {
    if (agentIds.length === 0) return { total: 0, activeCount: 0, inProgressCount: 0, erpCount: 0, deniedCount: 0 };
    const [statsRow] = await db
      .select({
        total: count(),
        activeCount: count(sql`CASE WHEN ${cisSubmissions.status} NOT IN ('draft','erp_encoded','denied','returned') THEN 1 END`),
        inProgressCount: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
        erpCount: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
        deniedCount: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(inArray(cisSubmissions.agentId, agentIds));
    return {
      total: Number(statsRow?.total ?? 0),
      activeCount: Number(statsRow?.activeCount ?? 0),
      inProgressCount: Number(statsRow?.inProgressCount ?? 0),
      erpCount: Number(statsRow?.erpCount ?? 0),
      deniedCount: Number(statsRow?.deniedCount ?? 0),
    };
  },
  ["manager-stats"],
  { tags: ["manager-stats"] }
);

/**
 * Cached workflow history for a user — revalidates every 10 seconds.
 * Used by legal, finance, and approver dashboards.
 */
export const getUserWorkflowHistory = unstable_cache(
  async (actorId: string, actions: readonly string[]) => {
    return db
      .select({ cisId: workflowEvents.cisId, action: workflowEvents.action })
      .from(workflowEvents)
      .where(
        and(
          eq(workflowEvents.actorId, actorId),
          inArray(workflowEvents.action, actions as typeof workflowEvents.action.enumValues)
        )
      )
      .limit(1000);
  },
  ["workflow-history"],
  { tags: ["workflow-history"] }
);

/**
 * Cached agent list for a manager — revalidates every 30 seconds.
 * If isTopManager is true, returns all active agents across the entire team.
 */
export const getManagerAgents = unstable_cache(
  async (managerId: string, isTopManager = false) => {
    if (isTopManager) {
      return db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            sql`${users.role} IN ('sales_agent', 'rsr')`
          )
        );
    }
    return db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, managerId));
  },
  ["manager-agents"],
  { tags: ["manager-agents"] }
);
