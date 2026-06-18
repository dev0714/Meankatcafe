import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { sanitizeTransform } from "@/lib/image-transform";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("cats");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const catId = id?.trim();
  if (!catId) return NextResponse.json({ error: "Missing cat id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const supabase = getSupabaseAdminClient();

  // Editing the cat's profile text fields.
  if ("fields" in b && b.fields && typeof b.fields === "object") {
    const f = b.fields as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
    const updates: Record<string, unknown> = {};
    if (str(f.name) !== undefined) updates.name = str(f.name);
    if (str(f.description) !== undefined) updates.description = str(f.description);
    if (typeof f.category === "string" && ["resident", "adoptable", "dual", "tlc", "other"].includes(f.category)) updates.category = f.category;
    if (f.tagline !== undefined) updates.tagline = str(f.tagline) || null;
    if (f.whereToFind !== undefined) updates.where_to_find = str(f.whereToFind) || null;
    if (f.howToMakeHappy !== undefined) updates.how_to_make_happy = str(f.howToMakeHappy) || null;
    if (typeof f.hidden === "boolean") updates.hidden = f.hidden;
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    if (updates.name === "" || updates.description === "") return NextResponse.json({ error: "Name and description are required." }, { status: 400 });

    const { error } = await supabase.schema("meankatcafe").from("cats").update(updates).eq("id", catId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Otherwise: updating an image's framing transform.
  const target = (b.target as string) === "before" ? "before" : "after";
  const column = target === "before" ? "before_image_transform" : "image_transform";
  const transform = sanitizeTransform(b.transform);

  const { error } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .update({ [column]: transform })
    .eq("id", catId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, transform });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("cats");

  if (!session) {
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
