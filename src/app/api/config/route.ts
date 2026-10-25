import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  const env = getEnv();
  const publicKey = env.NEXT_PUBLIC_API_KEY?.trim();
  const privateKey = env.API_PRIVATE_KEY?.trim();

  return NextResponse.json({
    ok: true,
    api: {
      publicKey: publicKey || null,
      privateKeyConfigured: Boolean(privateKey),
      isConfigured: Boolean(publicKey && privateKey),
    },
  });
}
