import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { PROVIDERS, getRedirectUri, isProvider } from "@/lib/social";
import { createState } from "@/lib/social/oauth-state";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

// Kicks off the OAuth consent flow for a provider. The admin's browser is redirected
// to the platform; the platform redirects back to /api/social/callback/[provider].
export async function GET(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("social");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  if (!isProvider(platform)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const provider = PROVIDERS[platform];
  if (!provider.isConfigured()) {
    const base = (process.env.APP_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
    return NextResponse.redirect(`${base}/admin?tab=social&social_error=${platform}_not_configured`);
  }

  const state = createState({ provider: platform, uid: session.userId });
  const url = provider.connectUrl(state, getRedirectUri(platform));
  return NextResponse.redirect(url);
}
