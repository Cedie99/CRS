import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { ManagerActions } from "@/components/actions/manager-actions";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History } from "lucide-react";

export default async function ManagerCisDetailPage({
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

  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, cis.agentId))
    .limit(1);

  if (!agent || agent.managerId !== session.user.id) notFound();

  const events = await db
    .select({
      id: workflowEvents.id,
      action: workflowEvents.action,
      note: workflowEvents.note,
      createdAt: workflowEvents.createdAt,
      actorName: users.fullName,
      actorRole: users.role,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(workflowEvents)
    .innerJoin(users, eq(workflowEvents.actorId, users.id))
    .where(eq(workflowEvents.cisId, id))
    .orderBy(workflowEvents.createdAt);

  const canAct = cis.status === "pending_endorsement";

  return (
    <div className="space-y-5">
      <Link
        href="/manager"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Main */}
        <div className="space-y-5 lg:col-span-3">
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
          {canAct && <ManagerActions cisId={id} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:col-span-2">
          <WorkflowStepper status={cis.status as any} customerType={cis.customerType} />
          <WorkflowHandoff status={cis.status as any} customerType={cis.customerType} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                <History className="h-4 w-4 text-zinc-400" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={events as any} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
