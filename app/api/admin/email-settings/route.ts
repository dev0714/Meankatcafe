import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getEmailSettings } from "@/lib/email";

export const runtime = "nodejs";

// GET — current email settings for the admin form. The SMTP password is never
// returned; the form only learns whether one is stored (hasPassword).
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const s = await getEmailSettings();
  return NextResponse.json({
    email_smtp_host: s.email_smtp_host ?? "",
    email_smtp_port: s.email_smtp_port ?? "587",
    email_smtp_secure: s.email_smtp_secure ?? "false",
    email_smtp_user: s.email_smtp_user ?? "",
    email_from: s.email_from ?? "",
    email_admin_to: s.email_admin_to ?? "",
    email_notify_orders: s.email_notify_orders ?? "true",
    email_notify_bookings: s.email_notify_bookings ?? "true",
    email_notify_contact: s.email_notify_contact ?? "true",
    email_notify_volunteer: s.email_notify_volunteer ?? "true",
    hasPassword: Boolean(s.email_smtp_pass),
  });
}

// POST — save email settings. An empty password field keeps the stored one.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const updates: Record<string, string> = {
    email_smtp_host: str(body.email_smtp_host).trim(),
    email_smtp_port: str(body.email_smtp_port).trim() || "587",
    email_smtp_secure: body.email_smtp_secure ? "true" : "false",
    email_smtp_user: str(body.email_smtp_user).trim(),
    email_from: str(body.email_from).trim(),
    email_admin_to: str(body.email_admin_to).trim(),
    email_notify_orders: body.email_notify_orders === false ? "false" : "true",
    email_notify_bookings: body.email_notify_bookings === false ? "false" : "true",
    email_notify_contact: body.email_notify_contact === false ? "false" : "true",
    email_notify_volunteer: body.email_notify_volunteer === false ? "false" : "true",
  };
  // Only overwrite the password when a new non-empty one is provided.
  const newPass = str(body.email_smtp_pass);
  if (newPass) updates.email_smtp_pass = newPass;

  const supabase = getSupabaseAdminClient();
  for (const [key, value] of Object.entries(updates)) {
    const { error } = await supabase
      .schema("meankatcafe")
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
