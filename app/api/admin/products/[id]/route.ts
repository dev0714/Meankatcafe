import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import type { Product } from "@/lib/shop";

type RouteContext = { params: Promise<{ id: string }> };

const COLS =
  "id, slug, name, category, price_cents, description, badge, emoji, tile_color, image_path, active, stock, sort, created_at";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function serialize(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  bucket: string,
  row: Record<string, unknown>,
): Product {
  const imagePath = row.image_path as string | null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    priceCents: row.price_cents as number,
    description: row.description as string,
    badge: (row.badge as string) ?? null,
    emoji: row.emoji as string,
    tileColor: row.tile_color as string,
    imageUrl: imagePath ? supabase.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl : null,
    active: row.active as boolean,
    stock: (row.stock as number) ?? null,
    sort: row.sort as number,
    createdAt: row.created_at as string,
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
  const category = (formData.get("category") as string)?.trim();
  const priceRands = formData.get("priceRands") as string | null;
  const description = formData.get("description") as string | null;
  const badge = formData.get("badge") as string | null;
  const emoji = (formData.get("emoji") as string)?.trim();
  const tileColor = (formData.get("tileColor") as string)?.trim();
  const stock = formData.get("stock") as string | null;
  const sort = formData.get("sort") as string | null;
  const active = formData.get("active") as string | null;

  if (name) updates.name = name;
  if (category) updates.category = category;
  if (priceRands !== null && priceRands !== "") {
    const n = Number(priceRands);
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    updates.price_cents = Math.round(n * 100);
  }
  if (description !== null) updates.description = description;
  if (badge !== null) updates.badge = badge.trim() || null;
  if (emoji) updates.emoji = emoji;
  if (tileColor) updates.tile_color = tileColor;
  if (stock !== null && stock !== "") updates.stock = Math.max(0, Math.round(Number(stock) || 0));
  if (sort !== null && sort !== "") updates.sort = Math.round(Number(sort) || 0);
  if (active !== null) updates.active = active === "true" || active === "1";

  // Optional replacement image.
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = imageFile.name.includes(".") ? imageFile.name.split(".").pop() : "jpg";
    const fileName = `product-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const newPath = `products/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, imageFile, { contentType: imageFile.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data: prev } = await supabase.schema("meankatcafe").from("products").select("image_path").eq("id", id).maybeSingle();
    updates.image_path = newPath;
    if (prev?.image_path) await supabase.storage.from(bucket).remove([prev.image_path as string]);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("products")
    .update(updates)
    .eq("id", id)
    .select(COLS)
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, product: serialize(supabase, bucket, data) });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: row } = await supabase.schema("meankatcafe").from("products").select("image_path").eq("id", id).maybeSingle();
  const { error } = await supabase.schema("meankatcafe").from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (row?.image_path) await supabase.storage.from(bucket).remove([row.image_path as string]);

  return NextResponse.json({ ok: true });
}
