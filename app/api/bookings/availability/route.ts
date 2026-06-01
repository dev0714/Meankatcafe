import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { slotsForDate } from "@/lib/hours";
import { DEFAULT_BOOKINGS_PER_SLOT, type DayAvailability } from "@/lib/bookings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid ?date=YYYY-MM-DD is required." }, { status: 400 });
  }

  const slots = slotsForDate(date);
  const open = slots.length > 0;

  // No backend → everything looks fully open (preview / local).
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const limit = DEFAULT_BOOKINGS_PER_SLOT;
    const payload: DayAvailability = {
      date,
      open,
      limit,
      totalBooked: 0,
      slots: slots.map((slot) => ({ slot, booked: 0, remaining: limit })),
    };
    return NextResponse.json(payload);
  }

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
  for (const row of rows ?? []) {
    counts.set(row.slot as string, (counts.get(row.slot as string) ?? 0) + 1);
  }

  const payload: DayAvailability = {
    date,
    open,
    limit,
    totalBooked: rows?.length ?? 0,
    slots: slots.map((slot) => {
      const booked = counts.get(slot) ?? 0;
      return { slot, booked, remaining: Math.max(0, limit - booked) };
    }),
  };

  return NextResponse.json(payload);
}
