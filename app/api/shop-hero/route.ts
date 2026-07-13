import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

// Public: the shop home page hero image URL (managed from the café admin).
export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ imageUrl: null });
  }

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", "shop_hero_image_path")
    .maybeSingle();

  const path = (data?.value as string) || "";
  const imageUrl = path
    ? supabase.storage.from(getSupabaseBucketName()).getPublicUrl(path).data.publicUrl
    : null;

  return NextResponse.json({ imageUrl });
}
