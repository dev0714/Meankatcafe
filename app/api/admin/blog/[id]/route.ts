import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { BLOG_COLS, mapBlogRow, parseTags } from "@/lib/blog";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function publicUrl(supabase: ReturnType<typeof getSupabaseAdminClient>, bucket: string, path: unknown) {
  return path ? supabase.storage.from(bucket).getPublicUrl(path as string).data.publicUrl : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("blog");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const fd = await request.formData();
  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const title = (fd.get("title") as string)?.trim();
  const slug = (fd.get("slug") as string)?.trim();
  const excerpt = fd.get("excerpt") as string | null;
  const content = fd.get("content") as string | null;
  const tags = fd.get("tags") as string | null;
  const published = fd.get("published") as string | null;
  const sort = fd.get("sort") as string | null;

  if (title) updates.title = title;
  if (slug) updates.slug = slug;
  if (excerpt !== null) updates.excerpt = excerpt.trim();
  if (content !== null) updates.content = content.trim();
  if (tags !== null) updates.tags = parseTags(tags);
  if (published !== null) updates.published = published === "true";
  if (sort !== null && sort !== "") updates.sort = Math.round(Number(sort) || 0);

  const image = fd.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
    const newPath = `blog/${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(newPath, image, { contentType: image.type || "image/jpeg", upsert: false });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const { data: prev } = await supabase.schema("meankatcafe").from("blog_posts").select("cover_path").eq("id", id).maybeSingle();
    updates.cover_path = newPath;
    if (prev?.cover_path) await supabase.storage.from(bucket).remove([prev.cover_path as string]);
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select(BLOG_COLS)
    .single();

  if (error || !data) {
    const msg = error?.code === "23505" ? "That slug is already used by another post." : (error?.message ?? "Update failed.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, post: mapBlogRow(data, publicUrl(supabase, bucket, data.cover_path)) });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("blog");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { data: row } = await supabase.schema("meankatcafe").from("blog_posts").select("cover_path").eq("id", id).maybeSingle();
  const { error } = await supabase.schema("meankatcafe").from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (row?.cover_path) await supabase.storage.from(bucket).remove([row.cover_path as string]);

  return NextResponse.json({ ok: true });
}
