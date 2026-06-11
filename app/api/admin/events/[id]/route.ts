import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("events");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const formData = await request.formData();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const date = (formData.get("date") as string)?.trim();
  const time = (formData.get("time") as string)?.trim();

  if (!title || !description || !date) {
    return NextResponse.json({ error: "Title, description and date are required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const updates: Record<string, unknown> = { title, description, date, time: time || null };

  // Optional new banner image — replace the old one.
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = imageFile.name.includes(".") ? imageFile.name.split(".").pop() : "jpg";
    const fileName = `event-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    const newPath = `events/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, imageFile, { contentType: imageFile.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: prev } = await supabase.schema("meankatcafe").from("events").select("image_path").eq("id", id).maybeSingle();
    updates.image_path = newPath;
    if (prev?.image_path) await supabase.storage.from(bucket).remove([prev.image_path as string]);
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("events")
    .update(updates)
    .eq("id", id)
    .select("id, title, description, date, time, image_path, created_at")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });

  const imageUrl = data.image_path
    ? supabase.storage.from(bucket).getPublicUrl(data.image_path).data.publicUrl
    : null;

  return NextResponse.json({ ok: true, event: { ...data, imageUrl } });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSessionForArea("events");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: row } = await supabase
    .schema("meankatcafe")
    .from("events")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .schema("meankatcafe")
    .from("events")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.image_path) {
    await supabase.storage.from(bucket).remove([row.image_path]);
  }

  return NextResponse.json({ ok: true });
}
