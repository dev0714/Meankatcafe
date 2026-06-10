import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import { HELP_POSTER_SLOT_VALUES, posterPathKey, posterUrlKey, imagePathKey, imageUrlKey } from "@/lib/help-posters";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function isSlot(v: string): boolean {
  return (HELP_POSTER_SLOT_VALUES as string[]).includes(v);
}

function keysFor(slot: string, kind: string) {
  return kind === "image"
    ? { urlKey: imageUrlKey(slot), pathKey: imagePathKey(slot), folder: "help-images" }
    : { urlKey: posterUrlKey(slot), pathKey: posterPathKey(slot), folder: "help-posters" };
}

async function saveKeys(supabase: ReturnType<typeof getSupabaseAdminClient>, urlKey: string, pathKey: string, url: string, path: string) {
  const now = new Date().toISOString();
  await supabase.schema("meankatcafe").from("site_settings").upsert({ key: urlKey, value: url, updated_at: now }, { onConflict: "key" });
  await supabase.schema("meankatcafe").from("site_settings").upsert({ key: pathKey, value: path, updated_at: now }, { onConflict: "key" });
}

async function currentPath(supabase: ReturnType<typeof getSupabaseAdminClient>, pathKey: string) {
  const { data } = await supabase.schema("meankatcafe").from("site_settings").select("value").eq("key", pathKey).maybeSingle();
  return (data?.value as string) || "";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const slot = (formData.get("slot") as string)?.trim();
  const kind = (formData.get("kind") as string)?.trim() === "image" ? "image" : "poster";
  const image = formData.get("image");

  if (!slot || !isSlot(slot)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { urlKey, pathKey, folder } = keysFor(slot, kind);

  const prev = await currentPath(supabase, pathKey);
  if (prev) await supabase.storage.from(bucket).remove([prev]);

  const ext = image.name.includes(".") ? image.name.split(".").pop() : "png";
  const path = `${folder}/${slot}-${crypto.randomUUID()}.${sanitizeFileName(ext || "png")}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: image.type || "image/png", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  await saveKeys(supabase, urlKey, pathKey, url, path);

  return NextResponse.json({ ok: true, slot, kind, url });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slot = (searchParams.get("slot") ?? "").trim();
  const kind = (searchParams.get("kind") ?? "").trim() === "image" ? "image" : "poster";
  if (!slot || !isSlot(slot)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const { urlKey, pathKey } = keysFor(slot, kind);

  const prev = await currentPath(supabase, pathKey);
  if (prev) await supabase.storage.from(bucket).remove([prev]);

  await saveKeys(supabase, urlKey, pathKey, "", "");
  return NextResponse.json({ ok: true });
}
