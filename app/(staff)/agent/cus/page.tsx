import { eq, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, cusSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { CusListClient } from "./cus-list-client";

export const metadata = { title: "Customer Updates — CRS" };

export default async function AgentCusListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { role: string; id: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const [cusList, allCis] = await Promise.all([
    db
      .select({
        id: cusSubmissions.id,
        status: cusSubmissions.status,
        createdAt: cusSubmissions.createdAt,
        note: cusSubmissions.note,
        financeCreditTerms: cusSubmissions.financeCreditTerms,
        financeCreditLimit: cusSubmissions.financeCreditLimit,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        customerType: cisSubmissions.customerType,
      })
      .from(cusSubmissions)
      .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
      .where(eq(cusSubmissions.agentId, userId))
      .orderBy(desc(cusSubmissions.createdAt))
      .catch(() => [] as never[]),

    db
      .select({
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        cityMunicipality: cisSubmissions.cityMunicipality,
        postalCode: cisSubmissions.postalCode,
        businessType: cisSubmissions.businessType,
        paymentTerms: cisSubmissions.paymentTerms,
      })
      .from(cisSubmissions)
      .where(eq(cisSubmissions.agentId, userId))
      .orderBy(asc(cisSubmissions.tradeName))
      .catch(() => [] as never[]),
  ]);

  const approvedCisList = allCis.filter(
    (c) => c.status === "approved" || c.status === "erp_encoded"
  );

  return (
    <div className="space-y-6">
      <CusListClient cusList={cusList} approvedCisList={approvedCisList} />
    </div>
  );
}
