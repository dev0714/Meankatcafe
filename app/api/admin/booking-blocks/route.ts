import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const session = await getSessionForArea("bookings");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("booking_blocks")
    .select("id, date, start_time, end_time, title, price, notes, created_at")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return NextResponse.json([]);
  return NextResponse.json(
    data.map((r) => ({
      id: r.id,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      title: r.title,
      price: r.price,
      notes: r.notes,
    }))
  );
}

export async function POST(request: Request) {
  const session = await getSessionForArea("bookings");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const date = str(body.date);
  const startTime = str(body.startTime);
  const endTime = str(body.endTime);
  const title = str(body.title);
  const price = str(body.price);
  const notes = str(body.notes);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return NextResponse.json({ error: "Valid start and end times are required." }, { status: 400 });
  }
  if (endTime <= startTime) return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("booking_blocks")
    .insert({ date, start_time: startTime, end_time: endTime, title, price: price || null, notes: notes || null })
    .select("id, date, start_time, end_time, title, price, notes")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not save." }, { status: 500 });
  return NextResponse.json({
    ok: true,
    block: { id: data.id, date: data.date, startTime: data.start_time, endTime: data.end_time, title: data.title, price: data.price, notes: data.notes },
  });
}
