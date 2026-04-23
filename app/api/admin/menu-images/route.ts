import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient, getSupabaseBucketName } from "@/lib/supabase";

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
  const ext = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
  const filePath = `menu/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, image, { contentType: image.type || "image/jpeg", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: row, error: insertError } = await supabase
    .schema("meankatcafe")
    .from("menu_images")
    .insert({ image_path: filePath, created_by: session.userId })
    .select("id, image_path")
    .single();

  if (insertError || !row) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed." }, { status: 500 });
  }

  const url = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
  return NextResponse.json({ ok: true, image: { id: row.id, url } });
}
