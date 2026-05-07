import { redirect } from "next/navigation";

// Self-registration is disabled. Accounts are created by Admin only.
export default function RegisterPage() {
  redirect("/login");
}
