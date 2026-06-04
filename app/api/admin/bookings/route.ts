import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

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
  let query = supabase
    .schema("meankatcafe")
    .from("bookings")
    .select("id, date, slot, name, email, phone, party_size, status, created_at")
    .eq("status", "confirmed");

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query.order("date", { ascending: true }).order("slot", { ascending: true });

  if (error || !data) return NextResponse.json([]);

  return NextResponse.json(
    data.map((row) => ({
      id: row.id,
      date: row.date,
      slot: row.slot,
      name: row.name,
      email: row.email,
      phone: row.phone,
      partySize: row.party_size,
      status: row.status,
      createdAt: row.created_at,
    }))
  );
}
