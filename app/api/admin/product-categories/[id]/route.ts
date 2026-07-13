import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import type { ShopProductCategory } from "@/lib/shop";

type RouteContext = { params: Promise<{ id: string }> };

const COLS = "id, name, emoji, image_path, bg_color, sort, active, created_at";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function serialize(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  bucket: string,
  row: Record<string, unknown>,
): ShopProductCategory {
  const imagePath = row.image_path as string | null;
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: row.emoji as string,
    imageUrl: imagePath ? supabase.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl : null,
    bgColor: row.bg_color as string,
    sort: row.sort as number,
    active: row.active as boolean,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const formData = await request.formData();
  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const updates: Record<string, unknown> = {};
  const name = (formData.get("name") as string)?.trim();
  const emoji = (formData.get("emoji") as string)?.trim();
  const bgColor = (formData.get("bgColor") as string)?.trim();
  const sort = formData.get("sort") as string | null;
  const active = formData.get("active") as string | null;

  if (name) updates.name = name;
  if (emoji) updates.emoji = emoji;
  if (bgColor) updates.bg_color = bgColor;
  if (sort !== null && sort !== "") updates.sort = Math.round(Number(sort) || 0);
  if (active !== null) updates.active = active === "true" || active === "1";

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
    const newPath = `shop/category-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, image, { contentType: image.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data: prev } = await supabase.schema("meankatcafe").from("product_categories").select("image_path").eq("id", id).maybeSingle();
    updates.image_path = newPath;
    if (prev?.image_path) await supabase.storage.from(bucket).remove([prev.image_path as string]);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("product_categories")
    .update(updates)
    .eq("id", id)
    .select(COLS)
    .single();

  if (error || !data) {
    const msg = error?.code === "23505" ? "A category with that name already exists." : (error?.message ?? "Update failed.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, category: serialize(supabase, bucket, data) });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: row } = await supabase.schema("meankatcafe").from("product_categories").select("image_path").eq("id", id).maybeSingle();
  const { error } = await supabase.schema("meankatcafe").from("product_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (row?.image_path) await supabase.storage.from(bucket).remove([row.image_path as string]);

  return NextResponse.json({ ok: true });
}
