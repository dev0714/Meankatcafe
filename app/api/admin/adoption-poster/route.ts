import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function setPoster(supabase: ReturnType<typeof getSupabaseAdminClient>, url: string, path: string) {
  const now = new Date().toISOString();
  await supabase.schema("meankatcafe").from("site_settings")
    .upsert({ key: "adoption_poster_url", value: url, updated_at: now }, { onConflict: "key" });
  await supabase.schema("meankatcafe").from("site_settings")
    .upsert({ key: "adoption_poster_path", value: path, updated_at: now }, { onConflict: "key" });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  // Remove the previous poster file, if any.
  const { data: prev } = await supabase.schema("meankatcafe").from("site_settings")
    .select("value").eq("key", "adoption_poster_path").maybeSingle();
  if (prev?.value) await supabase.storage.from(bucket).remove([prev.value as string]);

  const ext = image.name.includes(".") ? image.name.split(".").pop() : "png";
  const path = `adoption/poster-${crypto.randomUUID()}.${sanitizeFileName(ext || "png")}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: image.type || "image/png", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  await setPoster(supabase, url, path);

  return NextResponse.json({ ok: true, url });
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: prev } = await supabase.schema("meankatcafe").from("site_settings")
    .select("value").eq("key", "adoption_poster_path").maybeSingle();
  if (prev?.value) await supabase.storage.from(bucket).remove([prev.value as string]);

  await setPoster(supabase, "", "");
  return NextResponse.json({ ok: true });
}
