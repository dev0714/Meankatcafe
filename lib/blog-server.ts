// Server-only: read blog posts from Supabase.

import { getSupabaseAdminClient, getSupabaseBucketName } from "./supabase";
import { BLOG_COLS, mapBlogRow, type BlogPost } from "./blog";

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getPosts(includeDrafts = false): Promise<BlogPost[]> {
  if (!configured()) return [];
  try {
    const supabase = getSupabaseAdminClient();
    const bucket = getSupabaseBucketName();
    let query = supabase.schema("meankatcafe").from("blog_posts").select(BLOG_COLS);
    if (!includeDrafts) query = query.eq("published", true);
    const { data, error } = await query
      .order("sort", { ascending: true })
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) =>
      mapBlogRow(
        row,
        row.cover_path
          ? supabase.storage.from(bucket).getPublicUrl(row.cover_path as string).data.publicUrl
          : null,
      ),
    );
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!configured()) return null;
  try {
    const supabase = getSupabaseAdminClient();
    const bucket = getSupabaseBucketName();
    const { data, error } = await supabase
      .schema("meankatcafe")
      .from("blog_posts")
      .select(BLOG_COLS)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error || !data) return null;
    return mapBlogRow(
      data,
      data.cover_path
        ? supabase.storage.from(bucket).getPublicUrl(data.cover_path as string).data.publicUrl
        : null,
    );
  } catch {
    return null;
  }
}
