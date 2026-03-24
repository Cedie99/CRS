import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  if (role === "sales_agent" || role === "rsr") redirect("/agent");
  if (role === "sales_manager" || role === "rsr_manager") redirect("/manager");
  if (role === "finance_reviewer") redirect("/finance");
  if (role === "legal_approver") redirect("/legal");
  if (role === "senior_approver") redirect("/approver");
  if (role === "sales_support") redirect("/support");
  if (role === "admin") redirect("/admin");

  // Unknown role — clear the stale session and send to login
  await signOut({ redirect: false });
  redirect("/login");
}
