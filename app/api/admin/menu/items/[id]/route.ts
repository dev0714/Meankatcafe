import { NextResponse } from "next/server";
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
  const { error } = await supabase.schema("meankatcafe").from("menu_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
