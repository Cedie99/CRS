import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CustomerForm } from "@/components/customer-form";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

async function getCisInfo(token: string) {
  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      customerType: cisSubmissions.customerType,
      agentCode: cisSubmissions.agentCode,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.publicToken, token))
    .limit(1);

  if (!cis || cis.status !== "draft") return null;
  return cis;
}

export default async function CustomerFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cis = await getCisInfo(token);

  if (!cis) notFound();

  return <CustomerForm token={token} agentCode={cis.agentCode ?? ""} customerType={cis.customerType ?? "end_user"} />;
}
