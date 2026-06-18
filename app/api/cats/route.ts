import { NextResponse } from "next/server";
import { DEFAULT_CATS } from "@/lib/cats";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  // Admin views (?all=1) include hidden cats; the public site never does.
  const { searchParams } = new URL(request.url);
  const wantsAll = searchParams.get("all") === "1";
  const includeHidden = wantsAll && !!(await getSessionForArea("cats"));

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("id, name, description, category, tagline, where_to_find, how_to_make_happy, hidden, image_path, before_image_path, image_transform, before_image_transform, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return NextResponse.json(DEFAULT_CATS);
  }

  const visible = includeHidden ? data : data.filter((r) => !r.hidden);

  const bucket = getSupabaseBucketName();
  const catIds = visible.map((r) => r.id);

  // Fetch all extra images for these cats
  const { data: extraImages } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .select("id, cat_id, image_path, type, display_order, transform")
    .in("cat_id", catIds)
    .order("display_order", { ascending: true });

  const getUrl = (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const cats = visible.map((row) => {
    const primaryUrl = row.image_path ? getUrl(row.image_path) : null;
    const legacyBeforeUrl = row.before_image_path ? getUrl(row.before_image_path) : null;

    const extras = (extraImages ?? []).filter((img) => img.cat_id === row.id);
    const afterExtras = extras.filter((img) => img.type === "after");
    const beforeExtras = extras.filter((img) => img.type === "before");

    const images = [
      ...(primaryUrl ? [{ url: primaryUrl, dbId: null, transform: row.image_transform ?? null }] : []),
      ...afterExtras.map((img) => ({ url: getUrl(img.image_path), dbId: img.id as string, transform: img.transform ?? null })),
    ];

    const beforeImages = [
      ...(legacyBeforeUrl ? [{ url: legacyBeforeUrl, dbId: null, transform: row.before_image_transform ?? null }] : []),
      ...beforeExtras.map((img) => ({ url: getUrl(img.image_path), dbId: img.id as string, transform: img.transform ?? null })),
    ];

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      tagline: row.tagline,
      whereToFind: row.where_to_find,
      howToMakeHappy: row.how_to_make_happy,
      hidden: row.hidden ?? false,
      images: images.map((i) => i.url),
      afterImageDbIds: images.map((i) => i.dbId),
      imageTransforms: images.map((i) => i.transform),
      beforeImages: beforeImages.map((i) => i.url),
      beforeImageDbIds: beforeImages.map((i) => i.dbId),
      beforeImageTransforms: beforeImages.map((i) => i.transform),
      createdAt: row.created_at,
    };
  });

  return NextResponse.json(cats);
}
