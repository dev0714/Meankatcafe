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
    .select("id, name, description, category, image_path, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return NextResponse.json(DEFAULT_CATS);
  }

  const bucket = getSupabaseBucketName();
  const cats = data.map((row) => {
    const imagePath = row.image_path as string | null;
    const imageUrl = imagePath
      ? supabase.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl
      : "";

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      images: imageUrl ? [imageUrl] : [],
      createdAt: row.created_at,
    };
  });

  return NextResponse.json(cats);
}
