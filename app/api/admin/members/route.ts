import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateMemberCode } from "@/lib/membership";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function mapMember(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    planId: r.plan_id,
    planName: r.plan_name,
    price: r.price,
    status: r.status,
    validUntil: r.valid_until,
    memberCode: r.member_code,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export async function GET() {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("members")
    .select("id, name, email, phone, plan_id, plan_name, price, status, valid_until, member_code, notes, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return NextResponse.json([]);
  return NextResponse.json(data.map(mapMember));
}

export async function POST(request: Request) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const name = str(body.name);
  const email = str(body.email);
  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });

  const phone = str(body.phone);
  const planId = str(body.planId);

  const supabase = getSupabaseAdminClient();
  let planName: string | null = null;
  let price: string | null = null;
  if (planId) {
    const { data: plan } = await supabase.schema("meankatcafe").from("membership_plans").select("name, price").eq("id", planId).maybeSingle();
    if (plan) { planName = plan.name as string; price = plan.price as string; }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const member_code = generateMemberCode();
    const { data, error } = await supabase
      .schema("meankatcafe")
      .from("members")
      .insert({ name, email, phone: phone || null, plan_id: planId || null, plan_name: planName, price, status: "pending", member_code })
      .select("id, name, email, phone, plan_id, plan_name, price, status, valid_until, member_code, notes, created_at")
      .single();
    if (!error && data) return NextResponse.json({ ok: true, member: mapMember(data) });
    if (!error?.message.toLowerCase().includes("unique") || !error.message.includes("member_code")) {
      return NextResponse.json({ error: error?.message ?? "Could not save." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not generate a unique member code. Try again." }, { status: 500 });
}
