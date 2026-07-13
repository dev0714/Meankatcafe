import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

// The "Café Approved" hero image on the shop home page. Stored as a bucket path
// in the site_settings key below; the shop reads it and renders it in the hero.
const KEY = "shop_hero_image_path";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function currentPath(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();
  const path = (data?.value as string) || "";
  return path || null;
}

export async function POST(request: Request) {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Please choose an image." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
  const path = `shop/hero-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: image.type || "image/jpeg", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const old = await currentPath(supabase);
  const { error } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .upsert({ key: KEY, value: path, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    await supabase.storage.from(bucket).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (old && old !== path) await supabase.storage.from(bucket).remove([old]);

  const imageUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, imageUrl });
}

export async function DELETE() {
  const session = await getSessionForArea("products");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const old = await currentPath(supabase);

  const { error } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .upsert({ key: KEY, value: "", updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (old) await supabase.storage.from(bucket).remove([old]);

  return NextResponse.json({ ok: true });
}
