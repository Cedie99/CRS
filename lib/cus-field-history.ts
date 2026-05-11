import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";

/**
 * Returns the beforeSnapshot from the most recent approved CUS for a given CIS.
 * This is used by CIS detail pages to show old field values inline.
 */
export async function getCusFieldHistory(
  cisId: string
): Promise<Record<string, string | null> | null> {
  const [row] = await db
    .select({ beforeSnapshot: cusSubmissions.beforeSnapshot })
    .from(cusSubmissions)
    .where(
      and(
        eq(cusSubmissions.cisId, cisId),
        eq(cusSubmissions.status, "approved"),
        isNotNull(cusSubmissions.beforeSnapshot)
      )
    )
    .orderBy(desc(cusSubmissions.updatedAt))
    .limit(1)
    .catch(() => [] as never[]);

  if (!row?.beforeSnapshot) return null;
  return row.beforeSnapshot as Record<string, string | null>;
}
