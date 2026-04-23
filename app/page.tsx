import { redirect } from "next/navigation";
import { auth, STAFF_ROUTES } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const destination = STAFF_ROUTES[role];

  if (destination) {
    redirect(destination);
  }

  redirect("/login");
}
