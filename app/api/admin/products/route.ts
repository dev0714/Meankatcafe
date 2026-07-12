import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { slugify, type Product } from "@/lib/shop";

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

const createSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  priceRands: z.coerce.number().min(0).max(1000000),
  description: z.string().max(2000).optional(),
  badge: z.string().max(40).optional(),
  emoji: z.string().max(8).optional(),
  tileColor: z.string().max(20).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  sort: z.coerce.number().int().optional(),
});

// GET — admin list (all products, including inactive).
export async function GET() {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("products")
    .select(COLS)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Load failed." }, { status: 500 });
  return NextResponse.json(data.map((row) => serialize(supabase, bucket, row)));
}

// POST — create a product (multipart form; optional image).
export async function POST(request: Request) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    priceRands: formData.get("priceRands"),
    description: (formData.get("description") as string) || undefined,
    badge: (formData.get("badge") as string) || undefined,
    emoji: (formData.get("emoji") as string) || undefined,
    tileColor: (formData.get("tileColor") as string) || undefined,
    stock: (formData.get("stock") as string) || undefined,
    sort: (formData.get("sort") as string) || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  // Unique slug from the name (append a short suffix if taken).
  let slug = slugify(parsed.data.name) || crypto.randomUUID().slice(0, 8);
  const { data: clash } = await supabase.schema("meankatcafe").from("products").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

  const imageFile = formData.get("image");
  let image_path: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = imageFile.name.includes(".") ? imageFile.name.split(".").pop() : "jpg";
    const fileName = `product-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    image_path = `products/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(image_path, imageFile, { contentType: imageFile.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const row = {
    slug,
    name: parsed.data.name,
    category: parsed.data.category,
    price_cents: Math.round(parsed.data.priceRands * 100),
    description: parsed.data.description ?? "",
    badge: parsed.data.badge ?? null,
    emoji: parsed.data.emoji || "🐾",
    tile_color: parsed.data.tileColor || "#f7daff",
    image_path,
    stock: parsed.data.stock ?? null,
    sort: parsed.data.sort ?? 0,
  };

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("products")
    .insert(row)
    .select(COLS)
    .single();

  if (error || !data) {
    if (image_path) await supabase.storage.from(bucket).remove([image_path]);
    return NextResponse.json({ error: error?.message ?? "Create failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: serialize(supabase, bucket, data) });
}
