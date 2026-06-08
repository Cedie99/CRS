import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { STAFF_ROUTES } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

let browserInstance: Awaited<ReturnType<typeof import("puppeteer").default.launch>> | null = null;

async function getBrowser() {
  if (browserInstance?.connected) return browserInstance;
  const puppeteer = await import("puppeteer");
  browserInstance = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  return browserInstance;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: userId } = session.user as { role: string; id: string };
  const { id } = await params;

  // Verify CIS exists
  const [row] = await db
    .select({ id: cisSubmissions.id, agentId: cisSubmissions.agentId })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Agents can only print their own submissions
  if ((role === "sales_agent" || role === "rsr") && row.agentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine page URL based on user's role
  const dashboardPath = STAFF_ROUTES[role];
  if (!dashboardPath) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const pageUrl = `${baseUrl}${dashboardPath}/${id}`;

  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport to A4-like dimensions for consistent rendering
    await page.setViewport({ width: 1240, height: 1754 });

    // Forward session cookies so NextAuth recognizes the user
    const cookies = cookieHeader.split(";").filter(Boolean).map((pair) => {
      const eqIdx = pair.indexOf("=");
      const name = eqIdx > 0 ? pair.slice(0, eqIdx).trim() : pair.trim();
      const value = eqIdx > 0 ? pair.slice(eqIdx + 1).trim() : "";
      return { name, value, domain: new URL(pageUrl).hostname, path: "/" };
    });
    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    // Navigate to the CIS detail page
    await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 45000 });

    // Wait for the print content to render
    await page.waitForSelector("[data-print-root]", { timeout: 20000 });

    // Allow images to finish loading
    await page.evaluate(() => document.fonts?.ready);
    await new Promise((r) => setTimeout(r, 1000));

    // Activate print media type so @media print CSS rules apply
    await page.emulateMediaType("print");

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "7mm", bottom: "7mm", left: "10mm", right: "10mm" },
      printBackground: true,
      preferCSSPageSize: true,
    });

    await page.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cis-form-${id.slice(0, 8)}.pdf"`,
        "Content-Length": pdf.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again or use the browser print function." },
      { status: 500 },
    );
  }
}
