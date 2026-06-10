import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function mapPlan(p: Record<string, unknown>) {
  return { id: p.id, name: p.name, price: p.price, periodMonths: p.period_months, description: p.description, active: p.active, displayOrder: p.display_order };
}

export async function GET() {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json([]);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("membership_plans")
    .select("id, name, price, period_months, description, active, display_order")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json([]);
  return NextResponse.json(data.map(mapPlan));
}

export async function POST(request: Request) {
  const session = await getSessionForArea("members");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const name = str(body.name);
  const price = str(body.price);
  const periodMonths = Math.max(1, Math.floor(Number(body.periodMonths) || 1));
  const description = str(body.description);
  if (!name || !price) return NextResponse.json({ error: "Name and price are required." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("membership_plans")
    .insert({ name, price, period_months: periodMonths, description: description || null })
    .select("id, name, price, period_months, description, active, display_order")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true, plan: mapPlan(data) });
}
