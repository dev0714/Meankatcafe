import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateMemberCode } from "@/lib/membership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const name = str(body.name);
  const email = str(body.email);
  const phone = str(body.phone);
  const planId = str(body.planId);
  const memberNames = Array.isArray(body.memberNames)
    ? body.memberNames.map(str).filter(Boolean).slice(0, 20)
    : [];

  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdminClient();

  let planName: string | null = null;
  let price: string | null = null;
  let maxMembers = 1;
  if (planId) {
    const { data: plan } = await supabase
      .schema("meankatcafe")
      .from("membership_plans")
      .select("name, price, max_members")
      .eq("id", planId)
      .maybeSingle();
    if (plan) {
      planName = plan.name as string;
      price = plan.price as string;
      maxMembers = (plan.max_members as number) ?? 1;
    }
  }

  // Family plans: keep the captured names, and count anyone beyond the included max.
  const names = maxMembers > 1 ? memberNames : [];
  const extraMembers = Math.max(0, names.length - maxMembers);

  // Retry a couple of times on the (rare) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const member_code = generateMemberCode();
    const { error } = await supabase
      .schema("meankatcafe")
      .from("members")
      .insert({
        name,
        email,
        phone: phone || null,
        plan_id: planId || null,
        plan_name: planName,
        price,
        status: "pending",
        member_code,
        member_names: names.length > 0 ? names : null,
        extra_members: extraMembers,
      });
    if (!error) return NextResponse.json({ ok: true });
    if (!error.message.toLowerCase().includes("unique") || !error.message.includes("member_code")) {
      return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 500 });
}
