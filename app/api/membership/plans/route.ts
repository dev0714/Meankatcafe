import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("membership_plans")
    .select("id, name, price, period_months, description, active, display_order, max_members, extra_member_price")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json([]);
  return NextResponse.json(
    data.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      periodMonths: p.period_months,
      description: p.description,
      active: p.active,
      displayOrder: p.display_order,
      maxMembers: p.max_members ?? 1,
      extraMemberPrice: p.extra_member_price,
    }))
  );
}
