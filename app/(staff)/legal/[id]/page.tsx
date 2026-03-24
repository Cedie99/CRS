import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { LegalActions } from "@/components/actions/legal-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function LegalCisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [cis] = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) notFound();

  const events = await db
    .select({
      id: workflowEvents.id,
      action: workflowEvents.action,
      note: workflowEvents.note,
      createdAt: workflowEvents.createdAt,
      actorName: users.fullName,
    })
    .from(workflowEvents)
    .innerJoin(users, eq(workflowEvents.actorId, users.id))
    .where(eq(workflowEvents.cisId, id))
    .orderBy(workflowEvents.createdAt);

  const canAct = cis.status === "pending_legal_review";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/legal"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      <CisInfoCard
        tradeName={cis.tradeName}
        contactPerson={cis.contactPerson}
        contactNumber={cis.contactNumber}
        emailAddress={cis.emailAddress}
        businessAddress={cis.businessAddress}
        cityMunicipality={cis.cityMunicipality}
        businessType={cis.businessType}
        tinNumber={cis.tinNumber}
        additionalNotes={cis.additionalNotes}
        customerType={cis.customerType}
        agentCode={cis.agentCode}
        agentType={cis.agentType}
        status={cis.status as any}
        createdAt={cis.createdAt}
        updatedAt={cis.updatedAt}
      />

      {canAct && <LegalActions cisId={id} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTimeline events={events as any} />
        </CardContent>
      </Card>
    </div>
  );
}
