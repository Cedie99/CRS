import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { AdminBackupPage, type BackupFilter } from "@/components/admin/admin-backup-page";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";

export const metadata = { title: "Backup Records — Admin — CRS" };

const PAGE_SIZE = 20;

function normalizeFilter(raw?: string): BackupFilter {
  return raw === "pending" || raw === "downloaded" ? raw : "all";
}

export default async function BackupPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/admin");

  const { page, q, filter: rawFilter } = await searchParams;
  const filter = normalizeFilter(rawFilter);
  const query = q?.trim() ?? "";
  const currentPage = getPageNumber(page);

  const searchCondition = and(
    eq(cisSubmissions.status, "erp_encoded"),
    query
      ? or(
          ilike(cisSubmissions.tradeName, `%${query}%`),
          ilike(cisSubmissions.contactPerson, `%${query}%`),
          ilike(cisSubmissions.customerCode, `%${query}%`),
          ilike(cisSubmissions.agentCode, `%${query}%`)
        )
      : undefined
  );
  const whereClause = and(
    searchCondition,
    filter === "pending" ? isNull(cisSubmissions.lastBackupAt) : undefined,
    filter === "downloaded" ? isNotNull(cisSubmissions.lastBackupAt) : undefined
  );

  const [[counts], matching] = await Promise.all([
    db
      .select({
        total: count(),
        downloaded: count(sql`CASE WHEN ${cisSubmissions.lastBackupAt} IS NOT NULL THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(searchCondition),
    // Lightweight list of every match so "select all matching" can span pages
    db
      .select({
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        customerCode: cisSubmissions.customerCode,
        lastBackupAt: cisSubmissions.lastBackupAt,
      })
      .from(cisSubmissions)
      .where(whereClause)
      .orderBy(desc(cisSubmissions.updatedAt)),
  ]);

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const records = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      customerProgram: cisSubmissions.customerProgram,
      agentCode: cisSubmissions.agentCode,
      customerCode: cisSubmissions.customerCode,
      updatedAt: cisSubmissions.updatedAt,
      lastBackupAt: cisSubmissions.lastBackupAt,
      lastBackupByName: users.fullName,
    })
    .from(cisSubmissions)
    .leftJoin(users, eq(cisSubmissions.lastBackupBy, users.id))
    .where(whereClause)
    .orderBy(desc(cisSubmissions.updatedAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const total = Number(counts?.total ?? 0);
  const downloaded = Number(counts?.downloaded ?? 0);

  return (
    <>
      <AdminBackupPage
        query={query}
        filter={filter}
        counts={{ all: total, pending: total - downloaded, downloaded }}
        records={records.map((r) => ({
          ...r,
          updatedAt: r.updatedAt.toISOString(),
          lastBackupAt: r.lastBackupAt?.toISOString() ?? null,
        }))}
        matching={matching.map((r) => ({
          id: r.id,
          tradeName: r.tradeName,
          customerCode: r.customerCode,
          lastBackupAt: r.lastBackupAt?.toISOString() ?? null,
        }))}
      />
      <DashboardPagination
        basePath="/admin/backup"
        currentPage={safePage}
        totalItems={matching.length}
        pageSize={PAGE_SIZE}
        searchParams={{ q: query || undefined, filter: filter === "all" ? undefined : filter }}
      />
    </>
  );
}
