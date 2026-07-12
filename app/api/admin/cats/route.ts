import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

const uploadSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  category: z.enum(["resident", "adoptable", "dual", "tlc", "other"]),
  tagline: z.string().max(120).optional(),
  whereToFind: z.string().max(600).optional(),
  howToMakeHappy: z.string().max(600).optional(),
  howToHelp: z.string().max(600).optional(),
});

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    const session = await getSessionForArea("cats");

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const parsed = uploadSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      category: formData.get("category"),
      tagline: (formData.get("tagline") as string) || undefined,
      whereToFind: (formData.get("whereToFind") as string) || undefined,
      howToMakeHappy: (formData.get("howToMakeHappy") as string) || undefined,
      howToHelp: (formData.get("howToHelp") as string) || undefined,
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

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, image, {
        contentType: image.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const baseRow = {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      tagline: parsed.data.tagline ?? null,
      where_to_find: parsed.data.whereToFind ?? null,
      how_to_make_happy: parsed.data.howToMakeHappy ?? null,
      image_path: filePath,
      created_by: session.userId,
    };
    const insertCat = (row: Record<string, unknown>) =>
      supabase
        .schema("meankatcafe")
        .from("cats")
        .insert(row)
        .select("id, name, description, category, tagline, where_to_find, how_to_make_happy, image_path, created_at")
        .single();

    let { data: created, error: insertError } = await insertCat({ ...baseRow, how_to_help: parsed.data.howToHelp ?? null });
    // Fallback for before the how_to_help column migration is run.
    if (insertError) {
      ({ data: created, error: insertError } = await insertCat(baseRow));
    }

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
        tagline: created.tagline,
        whereToFind: created.where_to_find,
        howToMakeHappy: created.how_to_make_happy,
        howToHelp: parsed.data.howToHelp ?? null,
        images: [publicUrl],
        createdAt: created.created_at,
      },
    });
  } catch (error) {
    console.error("Cat upload failed:", error);
    const message = error instanceof Error ? error.message : "Upload failed unexpectedly.";
    return NextResponse.json(
      {
        error: message,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
