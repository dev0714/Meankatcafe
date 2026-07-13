import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEmailSettings, sendMail, emailConfigured, adminRecipient } from "@/lib/email";

export const runtime = "nodejs";

// POST — send a test email to confirm the SMTP settings work.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const s = await getEmailSettings();
  if (!emailConfigured(s)) {
    return NextResponse.json({ error: "Fill in and save the SMTP settings first." }, { status: 400 });
  }
  const to = (body.to || adminRecipient(s)).trim();
  if (!to) return NextResponse.json({ error: "No recipient address set." }, { status: 400 });

  const result = await sendMail(
    {
      to,
      subject: "MeanKat Café — test email ✅",
      html: `<p>This is a test email from your MeanKat Café admin.</p><p>If you can read this, your SMTP settings are working and notifications will be delivered. 🐾</p>`,
    },
    s,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Send failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to });
}
