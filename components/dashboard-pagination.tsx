import Link from "next/link";

interface DashboardPaginationProps {
  basePath: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageParamName?: string;
  searchParams?: Record<string, string | undefined>;
}

function buildPageHref({
  basePath,
  page,
  pageParamName,
  searchParams,
}: {
  basePath: string;
  page: number;
  pageParamName: string;
  searchParams: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (!value || key === pageParamName) continue;
    params.set(key, value);
  }

  if (page > 1) {
    params.set(pageParamName, String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function getPageNumber(pageParam?: string): number {
  const parsed = Number(pageParam);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

export function DashboardPagination({
  basePath,
  currentPage,
  totalItems,
  pageSize,
  pageParamName = "page",
  searchParams = {},
}: DashboardPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const page = Math.min(currentPage, totalPages);

  const prevHref = buildPageHref({
    basePath,
    page: prevPage,
    pageParamName,
    searchParams,
  });
  const nextHref = buildPageHref({
    basePath,
    page: nextPage,
    pageParamName,
    searchParams,
  });

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-sm text-zinc-500 sm:text-left">
        Page <span className="font-semibold text-zinc-800">{page}</span> of{" "}
        <span className="font-semibold text-zinc-800">{totalPages}</span>
      </p>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        {page > 1 ? (
          <Link
            href={prevHref}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:flex-none"
          >
            Previous
          </Link>
        ) : (
          <span className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-center text-sm text-zinc-300 sm:flex-none">
            Previous
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={nextHref}
            className="flex-1 rounded-lg border border-[#2d6e1e] bg-[#2d6e1e] px-3 py-1.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#245919] sm:flex-none"
          >
            Next
          </Link>
        ) : (
          <span className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-center text-sm text-zinc-300 sm:flex-none">
            Next
          </span>
        )}
      </div>
    </div>
  );
}