import { NextResponse } from "next/server";
import crypto from "node:crypto";

// TEMPORARY diagnostic — reports a HASH (never the value) of the API key the
// server actually has, so we can confirm what's stored without leaking it.
// Remove this route once the key is verified.
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

export async function GET() {
  const agent = process.env.AGENT_API_KEY;
  const booking = process.env.BOOKING_API_KEY;
  const raw = agent || booking || "";
  const trimmed = raw.trim();
  return NextResponse.json({
    hasAgent: agent != null,
    hasBooking: booking != null,
    usedVar: agent != null ? "AGENT_API_KEY" : booking != null ? "BOOKING_API_KEY" : null,
    rawLen: raw.length,
    rawSha: sha(raw),
    trimmedLen: trimmed.length,
    trimmedSha: sha(trimmed),
  });
}
