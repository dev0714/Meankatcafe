import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { slotsForDate } from "@/lib/hours";
import { getOpeningWeek } from "@/lib/hours-server";

const SELECT = "id, date, slot, name, email, phone, party_size, actual_party_size, arrived_at, status, created_at";

type Row = {
  id: string;
  date: string;
  slot: string;
  name: string;
  email: string;
  phone: string | null;
  party_size: number;
  actual_party_size: number | null;
  arrived_at: string | null;
  status: string;
  created_at: string;
};

function mapBooking(row: Row) {
  return {
    id: row.id,
    date: row.date,
    slot: row.slot,
    name: row.name,
    email: row.email,
    phone: row.phone,
    partySize: row.party_size,
    actualPartySize: row.actual_party_size,
    arrivedAt: row.arrived_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const session = await getSessionForArea("bookings");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = getSupabaseAdminClient();
  const run = (cols: string) => {
    let query = supabase
      .schema("meankatcafe")
      .from("bookings")
      .select(cols)
      .eq("status", "confirmed");
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    return query.order("date", { ascending: true }).order("slot", { ascending: true });
  };

  let { data, error } = await run(SELECT);
  // Fallback for before the arrived_at / actual_party_size migration is run.
  if (error) {
    ({ data, error } = await run("id, date, slot, name, email, phone, party_size, status, created_at"));
  }
  if (error || !data) return NextResponse.json([]);

  return NextResponse.json((data as unknown as Row[]).map(mapBooking));
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Manual booking created by a volunteer/admin (walk-ins, phone bookings).
export async function POST(request: Request) {
  const session = await getSessionForArea("bookings");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const date = str(b.date);
  const slot = str(b.slot);
  const name = str(b.name);
  const email = str(b.email);
  const phone = str(b.phone);
  const partySize = Math.max(1, Math.min(50, Math.floor(Number(b.partySize) || 1)));

  if (!name || !date || !slot) {
    return NextResponse.json({ error: "Name, date and time are required." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(slot)) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 500 });
  }

  // Soft warning only — admins can deliberately book outside posted hours,
  // so we don't block, but we surface it so they know.
  const week = await getOpeningWeek();
  const offHours = !slotsForDate(week, date).includes(slot);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .insert({ date, slot, name, email, phone: phone || null, party_size: partySize, status: "confirmed" })
    .select(SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not save booking." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, booking: mapBooking(data as Row), offHours });
}
