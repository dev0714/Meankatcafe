import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = { params: { id: string } };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.schema("meankatcafe").from("menu_sections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.string().min(1).max(80),
});

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sectionId = params.id?.trim();
  if (!sectionId) return NextResponse.json({ error: "Missing section id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });

  const supabase = getSupabaseAdminClient();

  const { data: maxRow } = await supabase
    .schema("meankatcafe")
    .from("menu_items")
    .select("display_order")
    .eq("section_id", sectionId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = (maxRow?.display_order ?? -1) + 1;

  const { data: row, error } = await supabase
    .schema("meankatcafe")
    .from("menu_items")
    .insert({ section_id: sectionId, name: parsed.data.name, price: parsed.data.price, display_order: displayOrder })
    .select("id, name, price")
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });

  return NextResponse.json({ ok: true, item: { id: row.id, name: row.name, price: row.price } });
}
