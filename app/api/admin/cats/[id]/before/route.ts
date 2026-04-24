import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  // Get current cat to find its category folder
  const { data: cat } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("category, before_image_path")
    .eq("id", id)
    .single();

  if (!cat) return NextResponse.json({ error: "Cat not found." }, { status: 404 });

  // Delete old before image if exists
  if (cat.before_image_path) {
    await supabase.storage.from(bucket).remove([cat.before_image_path]);
  }

  const fileExt = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
  const fileName = `before-${crypto.randomUUID()}.${sanitizeFileName(fileExt || "jpg")}`;
  const filePath = `${cat.category}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, image, { contentType: image.type || "image/jpeg", upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: updateError } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .update({ before_image_path: filePath })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const url = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
  return NextResponse.json({ ok: true, url });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawDeleteId } = await params;
  const id = rawDeleteId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: cat } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("before_image_path")
    .eq("id", id)
    .single();

  if (cat?.before_image_path) {
    await supabase.storage.from(bucket).remove([cat.before_image_path]);
  }

  await supabase.schema("meankatcafe").from("cats").update({ before_image_path: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}
