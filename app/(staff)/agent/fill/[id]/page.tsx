import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CustomerForm } from "@/components/customer-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default async function AgentFillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as string;
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const { id } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      publicToken: cisSubmissions.publicToken,
      customerType: cisSubmissions.customerType,
      agentId: cisSubmissions.agentId,
      agentCode: cisSubmissions.agentCode,
      status: cisSubmissions.status,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis || cis.agentId !== session.user.id || cis.status !== "draft") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl py-6 px-4">
      <Breadcrumbs
        items={[
          { label: "My Submissions", href: "/agent" },
          { label: "Drafts", href: "/agent/drafts" },
          { label: "Agent Fill" },
        ]}
        className="mb-4"
      />
      <CustomerForm
        token={cis.publicToken}
        agentCode={cis.agentCode ?? ""}
        customerType={cis.customerType ?? "end_user"}
        agentFillMode
      />
    </div>
  );
}
