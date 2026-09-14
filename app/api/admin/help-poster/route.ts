import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";
import {
  HELP_POSTER_SLOT_VALUES, posterPathKey, posterUrlKey, imagePathKey, imageUrlKey,
  listKeyFor, parseHelpImages, serializeHelpImages, type HelpImage,
} from "@/lib/help-posters";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function isSlot(v: string): boolean {
  return (HELP_POSTER_SLOT_VALUES as string[]).includes(v);
}

function keysFor(slot: string, kind: string) {
  return kind === "image"
    ? { urlKey: imageUrlKey(slot), pathKey: imagePathKey(slot), listKey: listKeyFor(slot, "image"), folder: "help-images" }
    : { urlKey: posterUrlKey(slot), pathKey: posterPathKey(slot), listKey: listKeyFor(slot, "poster"), folder: "help-posters" };
}

type Supa = ReturnType<typeof getSupabaseAdminClient>;

async function setSetting(supabase: Supa, key: string, value: string) {
  await supabase.schema("meankatcafe").from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

async function getSetting(supabase: Supa, key: string) {
  const { data } = await supabase.schema("meankatcafe").from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string) || "";
}

/** Current images for a slot, migrating the legacy single-image keys on read. */
async function currentImages(supabase: Supa, keys: ReturnType<typeof keysFor>): Promise<HelpImage[]> {
  const list = parseHelpImages(await getSetting(supabase, keys.listKey));
  if (list.length) return list;
  const url = await getSetting(supabase, keys.urlKey);
  const path = await getSetting(supabase, keys.pathKey);
  return url ? [{ url, path }] : [];
}

/** Persist the list, keeping the legacy single keys pointed at the first image. */
async function saveImages(supabase: Supa, keys: ReturnType<typeof keysFor>, images: HelpImage[]) {
  await setSetting(supabase, keys.listKey, serializeHelpImages(images));
  await setSetting(supabase, keys.urlKey, images[0]?.url ?? "");
  await setSetting(supabase, keys.pathKey, images[0]?.path ?? "");
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
  const keys = keysFor(slot, kind);

  const ext = image.name.includes(".") ? image.name.split(".").pop() : "png";
  const path = `${keys.folder}/${slot}-${crypto.randomUUID()}.${sanitizeFileName(ext || "png")}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: image.type || "image/png", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  // Append — a slot can hold several images (multi-page infographics).
  const images = [...(await currentImages(supabase, keys)), { url, path }];
  await saveImages(supabase, keys, images);

  return NextResponse.json({ ok: true, slot, kind, url, images });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slot = (searchParams.get("slot") ?? "").trim();
  const kind = (searchParams.get("kind") ?? "").trim() === "image" ? "image" : "poster";
  const indexRaw = searchParams.get("index");
  if (!slot || !isSlot(slot)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const keys = keysFor(slot, kind);
  const images = await currentImages(supabase, keys);

  // No index → clear the whole slot (previous behaviour); otherwise drop one.
  let removed: HelpImage[];
  let remaining: HelpImage[];
  if (indexRaw === null || indexRaw === "") {
    removed = images;
    remaining = [];
  } else {
    const index = Number(indexRaw);
    if (!Number.isInteger(index) || index < 0 || index >= images.length) {
      return NextResponse.json({ error: "Invalid image index." }, { status: 400 });
    }
    removed = [images[index]];
    remaining = images.filter((_, i) => i !== index);
  }

  const paths = removed.map((im) => im.path).filter(Boolean);
  if (paths.length) await supabase.storage.from(bucket).remove(paths);

  await saveImages(supabase, keys, remaining);
  return NextResponse.json({ ok: true, images: remaining });
}
