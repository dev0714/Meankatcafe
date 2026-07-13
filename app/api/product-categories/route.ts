import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import type { ShopProductCategory } from "@/lib/shop";

const COLS = "id, name, emoji, image_path, bg_color, sort, active, created_at";

// Public list of shop categories. Admins (?all=1) also see inactive ones.
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
    .from("product_categories")
    .select(COLS)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json([]);

  const bucket = getSupabaseBucketName();
  const visible = includeInactive ? data : data.filter((r) => r.active);
  const categories: ShopProductCategory[] = visible.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    imageUrl: row.image_path
      ? supabase.storage.from(bucket).getPublicUrl(row.image_path).data.publicUrl
      : null,
    bgColor: row.bg_color,
    sort: row.sort,
    active: row.active,
  }));

  return NextResponse.json(categories);
}
