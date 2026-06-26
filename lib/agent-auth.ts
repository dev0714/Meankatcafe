import { NextResponse } from "next/server";
import crypto from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Shared auth for the /api/agent/* endpoints. Accepts AGENT_API_KEY (preferred)
// or BOOKING_API_KEY (so one key can power both bookings + chat).
// Key is sent as `Authorization: Bearer <KEY>` or `x-api-key: <KEY>`.
// Returns null when authorised, or a NextResponse to return when not.
export function checkAgentAuth(request: Request): NextResponse | null {
  // Trim both vars so a pasted trailing newline/space in the hosting config
  // doesn't cause a spurious mismatch. AGENT_API_KEY takes precedence, then BOOKING_API_KEY.
  const expected = (process.env.AGENT_API_KEY || process.env.BOOKING_API_KEY || "").trim();
  if (!expected) {
    return NextResponse.json({ error: "Agent API is not configured (missing AGENT_API_KEY)." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const provided = bearer || request.headers.get("x-api-key")?.trim() || "";
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized — invalid or missing API key." }, { status: 401 });
  }
  return null;
}
