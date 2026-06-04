import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  const session = await getSessionForArea("volunteers");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("volunteer_applications")
    .select("id, full_name, email, whatsapp_number, suburb, agree_terms, answers, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return NextResponse.json([]);

  return NextResponse.json(
    data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      whatsappNumber: row.whatsapp_number,
      suburb: row.suburb,
      agreeTerms: row.agree_terms,
      answers: row.answers ?? {},
      createdAt: row.created_at,
    }))
  );
}
