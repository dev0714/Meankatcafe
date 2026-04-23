import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabase";

const schema = z.object({
  title: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8),
  filterGroup: z.string().min(1).max(60),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: maxRow } = await supabase
    .schema("meankatcafe")
    .from("menu_sections")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = (maxRow?.display_order ?? -1) + 1;

  const { data: row, error } = await supabase
    .schema("meankatcafe")
    .from("menu_sections")
    .insert({ title: parsed.data.title, emoji: parsed.data.emoji, filter_group: parsed.data.filterGroup, display_order: displayOrder })
    .select("id, title, emoji, filter_group, display_order")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, section: { id: row.id, title: row.title, emoji: row.emoji, filterGroup: row.filter_group, items: [] } });
}
