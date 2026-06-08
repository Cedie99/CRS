import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { STAFF_ROUTES } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

type Browser = Awaited<ReturnType<typeof import("puppeteer-core").launch>>;

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // Local dev — use puppeteer which bundles Chromium
    const puppeteerMod = await import("puppeteer");
    browserInstance = await puppeteerMod.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    }) as unknown as Browser;
  } else {
    // Production (Vercel) — use puppeteer-core + @sparticuz/chromium
    const { default: chromium } = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");
    browserInstance = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

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
    const cookies = cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter((pair) => {
        const eqIdx = pair.indexOf("=");
        return eqIdx > 0;
      })
      .map((pair) => {
        const eqIdx = pair.indexOf("=");
        return {
          name: pair.slice(0, eqIdx).trim(),
          value: pair.slice(eqIdx + 1).trim(),
          domain: new URL(pageUrl).hostname,
          path: "/",
        };
      });

    // Navigate first so the domain context is established
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    // Navigate again with authentication cookies
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
