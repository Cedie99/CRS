import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cisSubmissions, cusSubmissions } from "@/lib/db/schema";

function normalizeSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): Record<string, string | null> | null {
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (typeof value === "boolean") {
      out[key] = value ? "Yes" : "No";
    } else if (typeof value === "string" || typeof value === "number") {
      out[key] = String(value);
    } else if (Array.isArray(value)) {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = JSON.stringify(value);
    }
  }
  return out;
}

/**
 * Returns before-values for fields changed via approved CUS or agent edits on returned CIS.
 * Used by CIS detail pages to show old field values inline on the read-only form.
 */
export async function getCusFieldHistory(
  cisId: string
): Promise<Record<string, string | null> | null> {
  const [cisRow, cusRow] = await Promise.all([
    db
      .select({ agentEditBeforeSnapshot: cisSubmissions.agentEditBeforeSnapshot })
      .from(cisSubmissions)
      .where(eq(cisSubmissions.id, cisId))
      .limit(1)
      .catch(() => [] as never[]),
    db
      .select({ beforeSnapshot: cusSubmissions.beforeSnapshot })
      .from(cusSubmissions)
      .where(
        and(
          eq(cusSubmissions.cisId, cisId),
          eq(cusSubmissions.status, "approved"),
          isNotNull(cusSubmissions.beforeSnapshot),
        ),
      )
      .orderBy(desc(cusSubmissions.updatedAt))
      .limit(1)
      .catch(() => [] as never[]),
  ]);

  const cusHistory = normalizeSnapshot(
    cusRow[0]?.beforeSnapshot as Record<string, unknown> | null | undefined,
  );
  const agentHistory = normalizeSnapshot(
    cisRow[0]?.agentEditBeforeSnapshot as Record<string, unknown> | null | undefined,
  );

  if (!cusHistory && !agentHistory) return null;
  return { ...(cusHistory ?? {}), ...(agentHistory ?? {}) };
}
