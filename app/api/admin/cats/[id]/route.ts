import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { sanitizeTransform } from "@/lib/image-transform";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const catId = id?.trim();
  if (!catId) return NextResponse.json({ error: "Missing cat id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Which image's framing are we updating: the primary ("after") or the legacy "before".
  const target = (body as { target?: string }).target === "before" ? "before" : "after";
  const column = target === "before" ? "before_image_transform" : "image_transform";
  const transform = sanitizeTransform((body as { transform?: unknown }).transform);

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .update({ [column]: transform })
    .eq("id", catId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, transform });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();

  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const catId = id?.trim();
  if (!catId) {
    return NextResponse.json({ error: "Missing cat id." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: cat, error: lookupError } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("id, image_path")
    .eq("id", catId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!cat) {
    return NextResponse.json({ error: "Cat not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .delete()
    .eq("id", catId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (cat.image_path) {
    const { error: storageError } = await supabase.storage.from(bucket).remove([cat.image_path]);
    if (storageError) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Deleted cat row, but could not remove the image: ${storageError.message}`,
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
