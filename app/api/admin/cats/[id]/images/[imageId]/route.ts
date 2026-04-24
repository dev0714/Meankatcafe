import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, imageId: rawImageId } = await params;
  const catId = id?.trim();
  const imageId = rawImageId?.trim();
  if (!catId || !imageId) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: img } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .select("image_path")
    .eq("id", imageId)
    .eq("cat_id", catId)
    .single();

  if (img?.image_path) {
    await supabase.storage.from(bucket).remove([img.image_path]);
  }

  const { error } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .delete()
    .eq("id", imageId)
    .eq("cat_id", catId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
