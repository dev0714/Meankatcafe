import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

type RouteContext = { params: { id: string } };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: row } = await supabase
    .schema("meankatcafe")
    .from("menu_images")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.schema("meankatcafe").from("menu_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.image_path) {
    await supabase.storage.from(bucket).remove([row.image_path]);
  }

  return NextResponse.json({ ok: true });
}
