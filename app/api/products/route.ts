import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import type { Product } from "@/lib/shop";

const COLS =
  "id, slug, name, category, price_cents, description, badge, emoji, tile_color, image_path, active, stock, sort, created_at";

// Public catalogue. Admins (?all=1) also see inactive products.
export async function GET(request: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const wantsAll = searchParams.get("all") === "1";
  const includeInactive = wantsAll && !!(await getSessionForArea("products"));

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("products")
    .select(COLS)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json([]);

  const bucket = getSupabaseBucketName();
  const visible = includeInactive ? data : data.filter((r) => r.active);

  const products: Product[] = visible.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    priceCents: row.price_cents,
    description: row.description,
    badge: row.badge,
    emoji: row.emoji,
    tileColor: row.tile_color,
    imageUrl: row.image_path
      ? supabase.storage.from(bucket).getPublicUrl(row.image_path).data.publicUrl
      : null,
    active: row.active,
    stock: row.stock,
    sort: row.sort,
    createdAt: row.created_at,
  }));

  return NextResponse.json(products);
}
