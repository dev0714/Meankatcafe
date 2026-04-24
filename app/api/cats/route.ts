import { NextResponse } from "next/server";
import { DEFAULT_CATS } from "@/lib/cats";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("id, name, description, category, image_path, before_image_path, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return NextResponse.json(DEFAULT_CATS);
  }

  const bucket = getSupabaseBucketName();
  const catIds = data.map((r) => r.id);

  // Fetch all extra images for these cats
  const { data: extraImages } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .select("id, cat_id, image_path, type, display_order")
    .in("cat_id", catIds)
    .order("display_order", { ascending: true });

  const getUrl = (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const cats = data.map((row) => {
    const primaryUrl = row.image_path ? getUrl(row.image_path) : null;
    const legacyBeforeUrl = row.before_image_path ? getUrl(row.before_image_path) : null;

    const extras = (extraImages ?? []).filter((img) => img.cat_id === row.id);
    const afterExtras = extras.filter((img) => img.type === "after");
    const beforeExtras = extras.filter((img) => img.type === "before");

    const images = [
      ...(primaryUrl ? [{ url: primaryUrl, dbId: null }] : []),
      ...afterExtras.map((img) => ({ url: getUrl(img.image_path), dbId: img.id as string })),
    ];

    const beforeImages = [
      ...(legacyBeforeUrl ? [{ url: legacyBeforeUrl, dbId: null }] : []),
      ...beforeExtras.map((img) => ({ url: getUrl(img.image_path), dbId: img.id as string })),
    ];

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      images: images.map((i) => i.url),
      afterImageDbIds: images.map((i) => i.dbId),
      beforeImages: beforeImages.map((i) => i.url),
      beforeImageDbIds: beforeImages.map((i) => i.dbId),
      createdAt: row.created_at,
    };
  });

  return NextResponse.json(cats);
}
