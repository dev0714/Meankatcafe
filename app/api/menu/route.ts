import { NextResponse } from "next/server";
import { DEFAULT_MENU } from "@/lib/menu";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(DEFAULT_MENU);
  }

  const supabase = getSupabaseAdminClient();

  const { data: sections, error: secError } = await supabase
    .schema("meankatcafe")
    .from("menu_sections")
    .select("id, title, emoji, filter_group, display_order")
    .order("display_order", { ascending: true });

  if (secError || !sections || sections.length === 0) {
    return NextResponse.json(DEFAULT_MENU);
  }

  const { data: items } = await supabase
    .schema("meankatcafe")
    .from("menu_items")
    .select("id, section_id, name, price, display_order")
    .order("display_order", { ascending: true });

  return NextResponse.json(
    sections.map((s) => ({
      id: s.id,
      title: s.title,
      emoji: s.emoji,
      filterGroup: s.filter_group,
      items: (items ?? [])
        .filter((i) => i.section_id === s.id)
        .map((i) => ({ id: i.id, name: i.name, price: i.price })),
    }))
  );
}
