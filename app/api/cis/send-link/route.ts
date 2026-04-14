import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildEmailHtml, sendWorkflowEmails } from "@/lib/email";

const sendLinkSchema = z.object({
  to: z.string().email(),
  customerName: z.string().max(255).optional(),
  link: z.string().url(),
  cisId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { to, customerName, link, cisId } = parsed.data;
  const name = customerName?.trim() || "Valued Customer";

  const html = buildEmailHtml({
    name,
    title: "Action Required: Complete Your Customer Information Sheet",
    body: `Your agent from Oracle Petroleum – Toll Blend Division has initiated a Customer Information Sheet (CIS) for your account.<br><br>Please click the button below to complete and submit your information at your earliest convenience.`,
    cisId,
    reviewUrl: link,
    ctaLabel: "Fill Out Form",
    accentColor: "#2d6e1e",
  });

  await sendWorkflowEmails([
    {
      to,
      subject: "Action Required: Complete Your Customer Information Sheet — Oracle Petroleum",
      text: `Hello ${name},\n\nYour agent from Oracle Petroleum – Toll Blend Division has initiated a Customer Information Sheet (CIS) for your account.\n\nPlease fill out the form at:\n${link}\n\nThank you.`,
      html,
    },
  ]);

  return NextResponse.json({ ok: true });
}
