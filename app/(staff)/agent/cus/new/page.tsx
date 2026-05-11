import { redirect } from "next/navigation";

// CUS creation is now a modal on /agent/cus
export default function CusNewPage() {
  redirect("/agent/cus");
}
