import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

const ALLOWED = ["about", "home2"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = (searchParams.get("section") ?? "").trim();
  if (!ALLOWED.includes(section)) return NextResponse.json([]);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("gallery_images")
    .select("id, image_path, created_at")
    .eq("section", section)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return NextResponse.json([]);
  const bucket = getSupabaseBucketName();
  return NextResponse.json(
    data.map((row) => ({
      id: row.id,
      url: supabase.storage.from(bucket).getPublicUrl(row.image_path as string).data.publicUrl,
    }))
  );
}
