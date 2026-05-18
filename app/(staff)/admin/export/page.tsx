import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminExportPage } from "@/components/admin-export-page";

export const metadata = { title: "Export Report — Admin — CRS" };

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "admin") redirect("/admin");
  return <AdminExportPage />;
}
