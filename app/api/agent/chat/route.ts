import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkAgentAuth } from "@/lib/agent-auth";

// ───────────────────────────────────────────────────────────────
// WhatsApp AI chat memory — keyed by PHONE NUMBER (text), never a uuid.
// This is what stops the bot "forgetting" and the n8n uuid:"undefined" error.
//
//   GET  /api/agent/chat?phone=2781...&limit=20
//        → get-or-create the contact + return recent message history
//   POST /api/agent/chat   { phone, role, content, name? }
//        → upsert contact (updates name/last_seen) + append one message
//
// Auth: Authorization: Bearer <KEY>  (AGENT_API_KEY or BOOKING_API_KEY)
// ───────────────────────────────────────────────────────────────

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
// Normalise to digits only so "+27 81…", "081…", "27 81…" map to one contact.
const normPhone = (v: unknown) => str(v).replace(/[^\d]/g, "");

async function upsertContact(phone: string, name?: string) {
  const supabase = getSupabaseAdminClient();
  const patch: Record<string, unknown> = { phone, last_seen_at: new Date().toISOString() };
  if (name) patch.name = name;
  const { data } = await supabase
    .schema("meankatcafe")
    .from("wa_contacts")
    .upsert(patch, { onConflict: "phone" })
    .select("id, phone, name, ai_enabled, created_at, last_seen_at")
    .single();
  return data;
}

export async function GET(request: Request) {
  const unauth = checkAgentAuth(request);
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const phone = normPhone(searchParams.get("phone"));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(searchParams.get("limit")) || 20)));
  if (!phone) {
    return NextResponse.json({ error: "A valid ?phone= is required." }, { status: 400 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 503 });
  }

  const contact = await upsertContact(phone);
  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .schema("meankatcafe")
    .from("wa_messages")
    .select("role, content, created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Return oldest → newest, ready to feed straight into an LLM.
  const messages = (rows ?? []).slice().reverse();
  return NextResponse.json({ contact, messages });
}

export async function POST(request: Request) {
  const unauth = checkAgentAuth(request);
  if (unauth) return unauth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const phone = normPhone(b.phone);
  const role = str(b.role) || "user";
  const content = str(b.content) || str(b.message);
  const name = str(b.name) || undefined;

  if (!phone) return NextResponse.json({ error: "phone is required." }, { status: 400 });
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });
  if (!["user", "assistant", "system"].includes(role)) {
    return NextResponse.json({ error: "role must be user, assistant or system." }, { status: 400 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 503 });
  }

  const contact = await upsertContact(phone, name);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("wa_messages")
    .insert({ phone, role, content })
    .select("id, phone, role, content, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not save the message." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, contact, message: data }, { status: 201 });
}
