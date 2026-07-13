// Outgoing email (SMTP) for notifications. Settings are stored in
// meankatcafe.site_settings and managed from the admin Email tab, so both the
// café site and the shop send through the same mailbox. Best-effort: a send
// failure never breaks the user-facing request.

import nodemailer from "nodemailer";
import { getSupabaseAdminClient } from "./supabase";

export type NotifyKind = "orders" | "bookings" | "contact" | "volunteer";

export const EMAIL_SETTING_KEYS = [
  "email_smtp_host",
  "email_smtp_port",
  "email_smtp_secure",
  "email_smtp_user",
  "email_smtp_pass",
  "email_from",
  "email_admin_to",
  "email_notify_orders",
  "email_notify_bookings",
  "email_notify_contact",
  "email_notify_volunteer",
] as const;

export type EmailSettings = Record<string, string>;

export async function getEmailSettings(): Promise<EmailSettings> {
  const out: EmailSettings = {};
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return out;
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .schema("meankatcafe")
      .from("site_settings")
      .select("key, value")
      .in("key", EMAIL_SETTING_KEYS as unknown as string[]);
    for (const row of data ?? []) out[row.key as string] = (row.value as string) ?? "";
  } catch {
    /* ignore */
  }
  return out;
}

export function emailConfigured(s: EmailSettings): boolean {
  return Boolean(s.email_smtp_host && s.email_smtp_user && s.email_smtp_pass && s.email_from);
}

// Notifications default ON once email is configured; only an explicit "false" disables one.
export function notifyEnabled(s: EmailSettings, kind: NotifyKind): boolean {
  return s[`email_notify_${kind}`] !== "false";
}

export function adminRecipient(s: EmailSettings): string {
  return (s.email_admin_to || s.email_smtp_user || "").trim();
}

export function makeTransport(s: EmailSettings) {
  const port = Number(s.email_smtp_port) || 587;
  return nodemailer.createTransport({
    host: s.email_smtp_host,
    port,
    secure: s.email_smtp_secure === "true" || port === 465,
    auth: { user: s.email_smtp_user, pass: s.email_smtp_pass },
  });
}

export async function sendMail(
  opts: { to: string; subject: string; html: string; text?: string; replyTo?: string },
  settings?: EmailSettings,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const s = settings ?? (await getEmailSettings());
  if (!emailConfigured(s)) return { ok: false, skipped: true, error: "Email not configured." };
  if (!opts.to) return { ok: false, skipped: true, error: "No recipient." };
  try {
    const transport = makeTransport(s);
    await transport.sendMail({
      from: s.email_from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      replyTo: opts.replyTo,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}
