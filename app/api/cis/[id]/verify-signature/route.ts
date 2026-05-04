import { NextResponse } from "next/server";
import { verifySeal } from "@/lib/signature-integrity";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { signedAt, dataUrl, seal } = body as {
    signedAt: string | null;
    dataUrl: string | null;
    seal: string | null;
  };

  if (!signedAt || !dataUrl || !seal) {
    return NextResponse.json({ verified: false });
  }

  try {
    const verified = verifySeal(id, new Date(signedAt), dataUrl, seal);
    return NextResponse.json({ verified });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
