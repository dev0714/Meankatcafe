import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("events")
    .select("id, title, description, date, time, image_path, created_at")
    .order("date", { ascending: true });

  if (error || !data) return NextResponse.json([]);

  const bucket = getSupabaseBucketName();
  const events = data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    imageUrl: row.image_path
      ? supabase.storage.from(bucket).getPublicUrl(row.image_path).data.publicUrl
      : null,
    createdAt: row.created_at,
  }));

  return NextResponse.json(events);
}
