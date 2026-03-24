import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { CopyLinkButton } from "@/components/copy-link-button";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Clock } from "lucide-react";

export default async function AgentCisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      publicToken: cisSubmissions.publicToken,
      agentId: cisSubmissions.agentId,
      agentCode: cisSubmissions.agentCode,
      agentType: cisSubmissions.agentType,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      contactNumber: cisSubmissions.contactNumber,
      emailAddress: cisSubmissions.emailAddress,
      businessAddress: cisSubmissions.businessAddress,
      cityMunicipality: cisSubmissions.cityMunicipality,
      businessType: cisSubmissions.businessType,
      tinNumber: cisSubmissions.tinNumber,
      additionalNotes: cisSubmissions.additionalNotes,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) notFound();

  // Agents can only see their own submissions
  if (cis.agentId !== session.user.id) notFound();

  const events = await db
    .select({
      id: workflowEvents.id,
      action: workflowEvents.action,
      note: workflowEvents.note,
      createdAt: workflowEvents.createdAt,
      actorName: users.fullName,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(workflowEvents)
    .innerJoin(users, eq(workflowEvents.actorId, users.id))
    .where(eq(workflowEvents.cisId, id))
    .orderBy(workflowEvents.createdAt);

  const returnedEvent = events.findLast((e) => e.action === "returned");
  const deniedEvent = events.findLast((e) => e.action === "denied");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my submissions
      </Link>

      <WorkflowStepper status={cis.status as any} customerType={cis.customerType} />
      <WorkflowHandoff status={cis.status as any} customerType={cis.customerType} />

      {/* Draft — awaiting customer */}
      {cis.status === "draft" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <Clock className="h-4 w-4" />
            Awaiting customer to fill out the form
          </div>
          <p className="text-xs text-amber-600">
            Share this link with your customer. The form will enter the workflow once they submit.
          </p>
          <CopyLinkButton token={cis.publicToken} />
        </div>
      )}

      {/* Returned / denied banner */}
      {(cis.status === "returned" || cis.status === "denied") && (
        <div className={`flex gap-3 rounded-lg border px-4 py-3 ${
          cis.status === "returned"
            ? "border-rose-200 bg-rose-50"
            : "border-red-200 bg-red-50"
        }`}>
          <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${
            cis.status === "returned" ? "text-rose-500" : "text-red-500"
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              cis.status === "returned" ? "text-rose-700" : "text-red-700"
            }`}>
              {cis.status === "returned" ? "This submission was returned" : "This submission was denied"}
            </p>
            {(returnedEvent?.note || deniedEvent?.note) && (
              <p className={`mt-0.5 text-sm ${
                cis.status === "returned" ? "text-rose-600" : "text-red-600"
              }`}>
                {returnedEvent?.note ?? deniedEvent?.note}
              </p>
            )}
            {cis.status === "returned" && (
              <p className="mt-1 text-xs text-rose-500">
                To resubmit, please create a new CRS form with the corrections.
              </p>
            )}
          </div>
        </div>
      )}

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
