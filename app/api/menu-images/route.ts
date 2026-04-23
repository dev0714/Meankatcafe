import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

const FALLBACK = [
  { id: "builtin-1", url: "/menu1.jpg" },
  { id: "builtin-2", url: "/menu2.jpg" },
];

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(FALLBACK);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("menu_images")
    .select("id, image_path, created_at")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return NextResponse.json(FALLBACK);
  }

  const bucket = getSupabaseBucketName();
  return NextResponse.json(
    data.map((row) => ({
      id: row.id,
      url: supabase.storage.from(bucket).getPublicUrl(row.image_path as string).data.publicUrl,
    }))
  );
}
