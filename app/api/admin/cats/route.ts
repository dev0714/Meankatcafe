import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

const uploadSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  category: z.enum(["resident", "other"]),
});

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const session = getSession();

  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = uploadSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
  });
  const image = formData.get("image");

  if (!parsed.success || !(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Please complete every field and choose an image." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();
  const fileExt = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
  const fileName = `${crypto.randomUUID()}.${sanitizeFileName(fileExt || "jpg")}`;
  const filePath = `${parsed.data.category}/${fileName}`;
  const buffer = Buffer.from(await image.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: image.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: created, error: insertError } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      image_path: filePath,
      created_by: session.userId,
    })
    .select("id, name, description, category, image_path, created_at")
    .single();

  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message ?? "Unable to save cat." }, { status: 500 });
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;

  return NextResponse.json({
    ok: true,
    cat: {
      id: created.id,
      name: created.name,
      description: created.description,
      category: created.category,
      images: [publicUrl],
      createdAt: created.created_at,
    },
  });
}
