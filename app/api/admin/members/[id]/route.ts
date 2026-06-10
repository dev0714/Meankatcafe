import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { addMonths } from "@/lib/membership";
import { todayInCafeTZ } from "@/lib/hours";

type RouteContext = { params: Promise<{ id: string }> };

function mapMember(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone, planId: r.plan_id, planName: r.plan_name,
    price: r.price, status: r.status, validUntil: r.valid_until, memberCode: r.member_code, notes: r.notes, createdAt: r.created_at,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const supabase = getSupabaseAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "activate" || action === "renew") {
    // Determine the period from the member's plan (default 1 month).
    const { data: member } = await supabase
      .schema("meankatcafe").from("members").select("plan_id, valid_until").eq("id", id).maybeSingle();
    let period = 1;
    if (member?.plan_id) {
      const { data: plan } = await supabase.schema("meankatcafe").from("membership_plans").select("period_months").eq("id", member.plan_id).maybeSingle();
      if (plan?.period_months) period = Number(plan.period_months) || 1;
    }
    const today = todayInCafeTZ();
    const base = action === "renew" && member?.valid_until && (member.valid_until as string) > today
      ? (member.valid_until as string)
      : today;
    updates.status = "active";
    updates.valid_until = addMonths(base, period);
  } else {
    if (typeof body.status === "string" && ["pending", "active", "cancelled"].includes(body.status)) updates.status = body.status;
    if (typeof body.validUntil === "string") updates.valid_until = body.validUntil || null;
    if (typeof body.notes === "string") updates.notes = body.notes;
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("members")
    .update(updates)
    .eq("id", id)
    .select("id, name, email, phone, plan_id, plan_name, price, status, valid_until, member_code, notes, created_at")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, member: mapMember(data) });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.schema("meankatcafe").from("members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
