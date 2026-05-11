import { redirect } from "next/navigation";

// CUS detail is now a modal on /agent/cus — redirect with ?open= for deep links
export default async function AgentCusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/agent/cus?open=${id}`);
}
