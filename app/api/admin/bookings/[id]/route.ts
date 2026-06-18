import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("bookings");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (str(b.name) !== undefined) updates.name = str(b.name);
  if (str(b.email) !== undefined) updates.email = str(b.email);
  if (b.phone !== undefined) updates.phone = str(b.phone) || null;
  if (b.partySize !== undefined) updates.party_size = Math.max(1, Math.min(50, Math.floor(Number(b.partySize) || 1)));
  if (b.actualPartySize !== undefined) {
    updates.actual_party_size = b.actualPartySize === null || b.actualPartySize === ""
      ? null
      : Math.max(0, Math.min(50, Math.floor(Number(b.actualPartySize) || 0)));
  }
  // Check a guest in / undo: toggling arrival stamps or clears the time.
  if (b.arrived !== undefined) {
    updates.arrived_at = b.arrived ? new Date().toISOString() : null;
  }

  if (updates.name === "") {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select("id, date, slot, name, email, phone, party_size, actual_party_size, arrived_at, status, created_at")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });

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
      actualPartySize: data.actual_party_size,
      arrivedAt: data.arrived_at,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("bookings");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .schema("meankatcafe")
    .from("bookings")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
