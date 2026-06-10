import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

export async function GET() {
  const session = await getSessionForArea("social");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { data, error } = await supabase
    .schema("socialsync")
    .from("social_posts")
    .select("id, prompt, caption, image_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []).map((post) => ({
    id: post.id,
    prompt: post.prompt,
    caption: post.caption,
    status: post.status,
    createdAt: post.created_at,
    imageUrl: post.image_path
      ? supabase.storage.from(bucket).getPublicUrl(post.image_path).data.publicUrl
      : null,
  }));

  return NextResponse.json(posts);
}
