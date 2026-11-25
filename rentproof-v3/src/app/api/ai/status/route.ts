import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.TOKENLAVKA_KEY?.trim() || process.env.TOKENLAVKA_API_KEY?.trim());
  return NextResponse.json({ configured }, { headers: { "Cache-Control": "no-store" } });
}
