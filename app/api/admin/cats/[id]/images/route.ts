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
  const type = formData.get("type") as string;

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (type !== "after" && type !== "before") {
    return NextResponse.json({ error: "type must be 'after' or 'before'." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBucketName();

  const { data: cat } = await supabase
    .schema("meankatcafe")
    .from("cats")
    .select("category")
    .eq("id", id)
    .single();

  if (!cat) return NextResponse.json({ error: "Cat not found." }, { status: 404 });

  // Get next display_order
  const { data: maxRow } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .select("display_order")
    .eq("cat_id", id)
    .eq("type", type)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = (maxRow?.display_order ?? -1) + 1;

  const fileExt = image.name.includes(".") ? image.name.split(".").pop() : "jpg";
  const fileName = `${type}-${crypto.randomUUID()}.${sanitizeFileName(fileExt || "jpg")}`;
  const filePath = `${cat.category}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, image, { contentType: image.type || "image/jpeg", upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: row, error: insertError } = await supabase
    .schema("meankatcafe")
    .from("cat_images")
    .insert({ cat_id: id, image_path: filePath, type, display_order: displayOrder })
    .select("id, image_path, type, display_order")
    .single();

  if (insertError || !row) {
    await supabase.storage.from(bucket).remove([filePath]);
    return NextResponse.json({ error: insertError?.message ?? "Insert failed." }, { status: 500 });
  }

  const url = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
  return NextResponse.json({ ok: true, image: { id: row.id, url, type, displayOrder: row.display_order } });
}
