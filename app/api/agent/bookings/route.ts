import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { slotsForDate, todayInCafeTZ, toMinutes, type WeekHours } from "@/lib/hours";
import { getOpeningWeek } from "@/lib/hours-server";
import { DEFAULT_BOOKINGS_PER_SLOT, type DayAvailability } from "@/lib/bookings";

// ───────────────────────────────────────────────────────────────
// Machine-to-machine booking API for an external AI agent.
//   GET  /api/agent/bookings?date=YYYY-MM-DD  → availability for a day
//   POST /api/agent/bookings                  → create a booking
// Auth: send the API key as either
//   Authorization: Bearer <KEY>     or     x-api-key: <KEY>
// The key is the BOOKING_API_KEY environment variable.
// ───────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Returns null when authorised, or a NextResponse to return when not.
function checkAuth(request: Request): NextResponse | null {
  const expected = process.env.BOOKING_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Booking API is not configured (missing BOOKING_API_KEY)." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const provided = bearer || request.headers.get("x-api-key")?.trim() || "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized — invalid or missing API key." }, { status: 401 });
  }
  return null;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function dayAvailability(date: string, week: WeekHours): Promise<DayAvailability> {
  const slots = slotsForDate(week, date);
  const open = slots.length > 0;
  const supabase = getSupabaseAdminClient();

  const { data: setting } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", "bookings_per_slot")
    .maybeSingle();
  const limit = Math.max(1, Number(setting?.value) || DEFAULT_BOOKINGS_PER_SLOT);

  const { data: rows } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .select("slot")
    .eq("date", date)
    .eq("status", "confirmed");
  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.slot as string, (counts.get(r.slot as string) ?? 0) + 1);

  const { data: blocks } = await supabase
    .schema("meankatcafe")
    .from("booking_blocks")
    .select("start_time, end_time")
    .eq("date", date);
  const blockRanges = (blocks ?? []).map((b) => [toMinutes(b.start_time as string), toMinutes(b.end_time as string)] as const);
  const isBlocked = (slot: string) => {
    const t = toMinutes(slot);
    return blockRanges.some(([s, e]) => t >= s && t < e);
  };

  const slotInfos = slots.map((slot) => {
    const booked = counts.get(slot) ?? 0;
    const blocked = isBlocked(slot);
    return { slot, booked, remaining: blocked ? 0 : Math.max(0, limit - booked), blocked };
  });

  return {
    date,
    open,
    limit,
    totalBooked: rows?.length ?? 0,
    slots: slotInfos,
    availableSlots: slotInfos.filter((s) => s.remaining > 0).map((s) => s.slot),
  };
}

// Iterate YYYY-MM-DD strings inclusively, timezone-independent.
function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let cur = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  while (cur <= end) {
    const d = new Date(cur);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
    cur += 86400000;
  }
  return out;
}

export async function GET(request: Request) {
  const unauth = checkAuth(request);
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 503 });
  }

  const week = await getOpeningWeek();

  // Range mode: ?from=YYYY-MM-DD&to=YYYY-MM-DD → availability for each day.
  if (from || to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: "from and to must both be YYYY-MM-DD." }, { status: 400 });
    }
    if (to < from) {
      return NextResponse.json({ error: "to must be on or after from." }, { status: 400 });
    }
    const dates = eachDate(from, to);
    if (dates.length > 62) {
      return NextResponse.json({ error: "Range too large — max 62 days." }, { status: 400 });
    }
    const days = await Promise.all(dates.map((d) => dayAvailability(d, week)));
    return NextResponse.json({ from, to, days });
  }

  // Single-day mode: ?date=YYYY-MM-DD
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Provide ?date=YYYY-MM-DD, or ?from=…&to=… for a range." }, { status: 400 });
  }
  return NextResponse.json(await dayAvailability(date, week));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const unauth = checkAuth(request);
  if (unauth) return unauth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const date = str(b.date);
  const slot = str(b.slot);
  const name = str(b.name);
  const email = str(b.email);
  const phone = str(b.phone);
  const partySize = Math.max(1, Math.min(50, Math.floor(Number(b.partySize) || 1)));

  if (!name || !date || !slot) {
    return NextResponse.json({ error: "name, date and slot are required." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(slot)) {
    return NextResponse.json({ error: "slot must be HH:MM (24h)." }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "email is not valid." }, { status: 400 });
  }
  if (date < todayInCafeTZ()) {
    return NextResponse.json({ error: "That date has already passed." }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 503 });
  }

  const week = await getOpeningWeek();
  if (!slotsForDate(week, date).includes(slot)) {
    return NextResponse.json({ error: "We're not open at that time — pick a slot from the availability endpoint." }, { status: 409 });
  }

  const supabase = getSupabaseAdminClient();

  // Capacity for the slot.
  const { data: setting } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", "bookings_per_slot")
    .maybeSingle();
  const limit = Math.max(1, Number(setting?.value) || DEFAULT_BOOKINGS_PER_SLOT);

  // Reject slots inside an admin block-out / private event.
  const { data: blocks } = await supabase
    .schema("meankatcafe")
    .from("booking_blocks")
    .select("start_time, end_time")
    .eq("date", date);
  const t = toMinutes(slot);
  if ((blocks ?? []).some((bl) => t >= toMinutes(bl.start_time as string) && t < toMinutes(bl.end_time as string))) {
    return NextResponse.json({ error: "That time is reserved for a private event." }, { status: 409 });
  }

  const { count } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("slot", slot)
    .eq("status", "confirmed");
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: "That time slot is fully booked." }, { status: 409 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .insert({ date, slot, name, email: email || "", phone: phone || null, party_size: partySize, status: "confirmed" })
    .select("id, date, slot, name, email, phone, party_size, status, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create the booking." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    booking: {
      id: data.id,
      date: data.date,
      slot: data.slot,
      name: data.name,
      email: data.email,
      phone: data.phone,
      partySize: data.party_size,
      status: data.status,
      createdAt: data.created_at,
    },
  }, { status: 201 });
}
