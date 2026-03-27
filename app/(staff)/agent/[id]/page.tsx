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
import { ArrowLeft, AlertTriangle, Clock, History } from "lucide-react";

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
  if (cis.agentId !== session.user.id) notFound();

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

  const returnedEvent = events.findLast((e) => e.action === "returned");
  const deniedEvent = events.findLast((e) => e.action === "denied");

  return (
    <div className="space-y-5">
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my submissions
      </Link>

      {/* Status banners */}
      {cis.status === "draft" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock className="h-4 w-4" />
            Waiting for your customer to fill out the form
          </div>
          <p className="text-xs text-amber-600">
            Copy the link below and send it to your customer. Once they complete and submit the form, it will automatically move to the approval process.
          </p>
          <CopyLinkButton token={cis.publicToken} />
        </div>
      )}

      {(cis.status === "returned" || cis.status === "denied") && (
        <div
          className={`flex gap-3 rounded-xl border px-5 py-4 ${
            cis.status === "returned"
              ? "border-rose-200 bg-rose-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              cis.status === "returned" ? "text-rose-500" : "text-red-500"
            }`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                cis.status === "returned" ? "text-rose-700" : "text-red-700"
              }`}
            >
              {cis.status === "returned"
                ? "This form was sent back for corrections"
                : "This form was not approved"}
            </p>
            {(returnedEvent?.note || deniedEvent?.note) && (
              <p
                className={`mt-1 text-sm ${
                  cis.status === "returned" ? "text-rose-600" : "text-red-600"
                }`}
              >
                {returnedEvent?.note ?? deniedEvent?.note}
              </p>
            )}
            {cis.status === "returned" && (
              <p className="mt-1.5 text-xs text-rose-500">
                To resubmit, create a new customer form and apply the corrections above.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Two-column layout */}
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
