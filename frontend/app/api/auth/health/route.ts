import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public health check for auth env (no secret values exposed). */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const nextAuthUrl = process.env.NEXTAUTH_URL || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || "";
  const databaseUrl = process.env.DATABASE_URL || "";

  return NextResponse.json({
    ok: Boolean(
      clientId && clientSecret && nextAuthUrl && nextAuthSecret && databaseUrl
    ),
    googleClientIdPresent: Boolean(clientId),
    googleClientIdEndsWith: clientId.slice(-20),
    googleClientSecretPresent: Boolean(clientSecret),
    googleClientSecretLength: clientSecret.length,
    googleClientSecretStartsWith: clientSecret.slice(0, 7),
    nextAuthUrl,
    nextAuthSecretPresent: Boolean(nextAuthSecret),
    nextAuthSecretLength: nextAuthSecret.length,
    databaseUrlPresent: Boolean(databaseUrl),
    databaseHost: databaseUrl.includes("@")
      ? databaseUrl.split("@")[1]?.split("/")[0]
      : null,
    expectedCallback:
      "https://yt-ai-agent-singhharbhajan877-hue.vercel.app/api/auth/callback/google",
  });
}
