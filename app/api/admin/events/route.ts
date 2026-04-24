import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const body = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    date: formData.get("date") as string,
    time: (formData.get("time") as string) || undefined,
  };

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  const imageFile = formData.get("image");
  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  let image_path: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = imageFile.name.includes(".") ? imageFile.name.split(".").pop() : "jpg";
    const fileName = `event-${crypto.randomUUID()}.${sanitizeFileName(ext || "jpg")}`;
    image_path = `events/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(image_path, imageFile, { contentType: imageFile.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("events")
    .insert({ ...parsed.data, image_path })
    .select("id, title, description, date, time, image_path, created_at")
    .single();

  if (error) {
    if (image_path) await supabase.storage.from(bucket).remove([image_path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const imageUrl = data.image_path
    ? supabase.storage.from(bucket).getPublicUrl(data.image_path).data.publicUrl
    : null;

  return NextResponse.json({ ok: true, event: { ...data, imageUrl } });
}
