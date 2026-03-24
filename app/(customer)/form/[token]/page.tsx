import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";

async function getCisInfo(token: string) {
  // We can't use the db directly in a way that avoids the auth check,
  // so we fetch from our own public API
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/form/${token}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; customerType: string; agentCode: string }>;
}

export default async function CustomerFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cis = await getCisInfo(token);

  if (!cis) notFound();

  return <CustomerForm token={token} agentCode={cis.agentCode} customerType={cis.customerType} />;
}
