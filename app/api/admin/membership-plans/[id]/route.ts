import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.price === "string") updates.price = body.price.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (body.periodMonths != null) updates.period_months = Math.max(1, Math.floor(Number(body.periodMonths) || 1));
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("membership_plans")
    .update(updates)
    .eq("id", id)
    .select("id, name, price, period_months, description, active, display_order")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, plan: { id: data.id, name: data.name, price: data.price, periodMonths: data.period_months, description: data.description, active: data.active, displayOrder: data.display_order } });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.schema("meankatcafe").from("membership_plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
