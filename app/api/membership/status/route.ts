import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "An email is required." }, { status: 400 });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ found: false });
  }

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .schema("meankatcafe")
    .from("members")
    .select("name, plan_name, status, valid_until, member_code")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    name: data.name,
    planName: data.plan_name,
    status: data.status,
    validUntil: data.valid_until,
    memberCode: data.member_code,
  });
}
