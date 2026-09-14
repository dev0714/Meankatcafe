import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { BLOG_COLS, mapBlogRow, parseTags } from "@/lib/blog";
import { slugify } from "@/lib/shop";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function publicUrl(supabase: ReturnType<typeof getSupabaseAdminClient>, bucket: string, path: unknown) {
  return path ? supabase.storage.from(bucket).getPublicUrl(path as string).data.publicUrl : null;
}

// GET — every post, drafts included.
export async function GET() {
  const session = await getSessionForArea("blog");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("blog_posts")
    .select(BLOG_COLS)
    .order("sort", { ascending: true })
    .order("published_at", { ascending: false });

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Load failed." }, { status: 500 });
  return NextResponse.json(data.map((row) => mapBlogRow(row, publicUrl(supabase, bucket, row.cover_path))));
}

// POST — create a post (multipart; optional cover image).
export async function POST(request: Request) {
  const session = await getSessionForArea("blog");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await request.formData();
  const title = (fd.get("title") as string)?.trim();
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  let slug = ((fd.get("slug") as string) || "").trim() || slugify(title);
  if (!slug) slug = crypto.randomUUID().slice(0, 8);
  const { data: clash } = await supabase.schema("meankatcafe").from("blog_posts").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

  const image = fd.get("image");
  let cover_path: string | null = null;
  if (image instanceof File && image.size > 0) {
    const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
    cover_path = `blog/${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(cover_path, image, { contentType: image.type || "image/jpeg", upsert: false });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("blog_posts")
    .insert({
      slug,
      title,
      excerpt: ((fd.get("excerpt") as string) || "").trim(),
      content: ((fd.get("content") as string) || "").trim(),
      tags: parseTags((fd.get("tags") as string) || ""),
      published: fd.get("published") === "true",
      sort: Math.round(Number(fd.get("sort")) || 0),
      cover_path,
    })
    .select(BLOG_COLS)
    .single();

  if (error || !data) {
    if (cover_path) await supabase.storage.from(bucket).remove([cover_path]);
    return NextResponse.json({ error: error?.message ?? "Create failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, post: mapBlogRow(data, publicUrl(supabase, bucket, data.cover_path)) });
}
