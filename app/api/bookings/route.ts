import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { slotsForDate, todayInCafeTZ, toMinutes } from "@/lib/hours";
import { getOpeningWeek } from "@/lib/hours-server";
import { DEFAULT_BOOKINGS_PER_SLOT } from "@/lib/bookings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = {
  date?: unknown;
  slot?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  partySize?: unknown;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const date = str(body.date);
  const slot = str(body.slot);
  const name = str(body.name);
  const email = str(body.email);
  const phone = str(body.phone);
  const partySize = Math.max(1, Math.min(20, Math.floor(Number(body.partySize) || 1)));

  if (!name || !email || !date || !slot) {
    return NextResponse.json({ error: "Name, email, date and time are all required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (date < todayInCafeTZ()) {
    return NextResponse.json({ error: "That date has already passed." }, { status: 400 });
  }
  const week = await getOpeningWeek();
  if (!slotsForDate(week, date).includes(slot)) {
    return NextResponse.json({ error: "We're not open at that time — please pick another slot." }, { status: 400 });
  }

  // No backend configured → accept so the form still works in preview.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdminClient();

  const { data: setting } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", "bookings_per_slot")
    .maybeSingle();
  const limit = Math.max(1, Number(setting?.value) || DEFAULT_BOOKINGS_PER_SLOT);

  // Reject slots that fall inside an admin block-out / private event.
  const { data: blocks } = await supabase
    .schema("meankatcafe")
    .from("booking_blocks")
    .select("start_time, end_time")
    .eq("date", date);
  const t = toMinutes(slot);
  if ((blocks ?? []).some((b) => t >= toMinutes(b.start_time as string) && t < toMinutes(b.end_time as string))) {
    return NextResponse.json({ error: "That time is reserved for a private event — please pick another slot." }, { status: 409 });
  }

  // Capacity check (count confirmed bookings already in this slot).
  const { count } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("slot", slot)
    .eq("status", "confirmed");

  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: "Sorry — that time slot is fully booked. Please choose another." }, { status: 409 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .insert({ date, slot, name, email, phone: phone || null, party_size: partySize, status: "confirmed" })
    .select("id, date, slot")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not complete your booking. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, booking: data });
}
