import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { ArrowLeft, LinkIcon, FileText, Plus } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { formatDistanceToNow } from "@/lib/utils";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Drafts — CRS" };

export default async function AgentDraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const conditions = [
    eq(cisSubmissions.agentId, session.user.id),
    eq(cisSubmissions.status, "draft"),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const drafts = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
    })
    .from(cisSubmissions)
    .where(and(...conditions))
    .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/agent"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my submissions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Awaiting Customer Submission</h1>
        <p className="mt-1 text-sm text-zinc-500">
          These links have been sent to customers but they haven&apos;t submitted their form yet.
          Click a row to resend or copy the link.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No pending drafts</h2>
          <p className="mt-1 text-sm text-zinc-500">All your customers have submitted their forms.</p>
          <Link href="/agent/new" className={`mt-5 ${buttonVariants()}`}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add New Customer
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
            <p className="text-sm font-semibold text-zinc-700">
              {drafts.length} pending link{drafts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ul className="divide-y divide-zinc-50">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/agent/new?id=${d.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                    <LinkIcon className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {d.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled customer</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Link generated {formatDistanceToNow(d.createdAt)} ago — waiting for customer to submit
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                    Awaiting
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
