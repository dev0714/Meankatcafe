import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import type { ShopProductCategory } from "@/lib/shop";

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

// GET — admin list (all categories, including inactive).
export async function GET() {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("product_categories")
    .select(COLS)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Load failed." }, { status: 500 });
  return NextResponse.json(data.map((row) => serialize(supabase, bucket, row)));
}

// POST — create a category (multipart; optional image).
export async function POST(request: Request) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim();
  const emoji = (formData.get("emoji") as string)?.trim() || "🐾";
  const bgColor = (formData.get("bgColor") as string)?.trim() || "#f7daff";
  const sort = Number(formData.get("sort")) || 0;
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const image = formData.get("image");
  let image_path: string | null = null;
  if (image instanceof File && image.size > 0) {
    const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
    image_path = `shop/category-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(image_path, image, { contentType: image.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("product_categories")
    .insert({ name, emoji, bg_color: bgColor, sort, image_path })
    .select(COLS)
    .single();

  if (error || !data) {
    if (image_path) await supabase.storage.from(bucket).remove([image_path]);
    const msg = error?.code === "23505" ? "A category with that name already exists." : (error?.message ?? "Create failed.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, category: serialize(supabase, bucket, data) });
}
