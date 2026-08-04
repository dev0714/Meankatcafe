import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { addMonths } from "@/lib/membership";
import { todayInCafeTZ } from "@/lib/hours";

type RouteContext = { params: Promise<{ id: string }> };

const COLS = "id, name, email, phone, plan_id, plan_name, price, status, paid_date, valid_until, member_code, notes, member_names, extra_members, created_at";

function mapMember(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone, planId: r.plan_id, planName: r.plan_name,
    price: r.price, status: r.status, paidDate: r.paid_date, validUntil: r.valid_until, memberCode: r.member_code,
    notes: r.notes, memberNames: r.member_names, extraMembers: r.extra_members, createdAt: r.created_at,
  };
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

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
    // The paid date is the exact date proof of payment was received (defaults to today).
    const paidDate = isDate(body.paidDate) ? body.paidDate : todayInCafeTZ();
    // Renewals extend from the later of the current expiry or the paid date, so no time is lost.
    const base = action === "renew" && member?.valid_until && (member.valid_until as string) > paidDate
      ? (member.valid_until as string)
      : paidDate;
    updates.status = "active";
    updates.paid_date = paidDate;
    updates.valid_until = addMonths(base, period);
  } else {
    if (typeof body.status === "string" && ["pending", "active", "cancelled"].includes(body.status)) updates.status = body.status;
    if (isDate(body.paidDate) || body.paidDate === "") updates.paid_date = body.paidDate || null;
    if (typeof body.validUntil === "string") updates.valid_until = body.validUntil || null;
    if (typeof body.notes === "string") updates.notes = body.notes;

    // Editable member details.
    if (typeof body.name === "string") {
      if (!str(body.name)) return NextResponse.json({ error: "Name is required." }, { status: 400 });
      updates.name = str(body.name);
    }
    if (typeof body.email === "string") {
      if (!str(body.email)) return NextResponse.json({ error: "Email is required." }, { status: 400 });
      updates.email = str(body.email);
    }
    if (typeof body.phone === "string") updates.phone = str(body.phone) || null;
    // Family/extra member names — stored as a text array.
    if (Array.isArray(body.memberNames)) {
      const names = body.memberNames.map(str).filter(Boolean);
      updates.member_names = names.length ? names : null;
    }
    if (typeof body.extraMembers === "number" && Number.isFinite(body.extraMembers)) {
      updates.extra_members = Math.max(0, Math.floor(body.extraMembers));
    }

    // Changing the plan also refreshes the stored plan name and price.
    if (typeof body.planId === "string") {
      const planId = str(body.planId);
      if (planId) {
        const { data: plan } = await supabase
          .schema("meankatcafe").from("membership_plans").select("name, price").eq("id", planId).maybeSingle();
        updates.plan_id = planId;
        updates.plan_name = (plan?.name as string) ?? null;
        updates.price = (plan?.price as string) ?? null;
      } else {
        updates.plan_id = null;
        updates.plan_name = null;
        updates.price = null;
      }
    }
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("members")
    .update(updates)
    .eq("id", id)
    .select(COLS)
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
