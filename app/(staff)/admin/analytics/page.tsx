import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminAnalyticsPage } from "@/components/admin-analytics-page";

export const metadata = { title: "Analytics — Admin — CRS" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "admin") redirect("/admin");
  return <AdminAnalyticsPage />;
}
