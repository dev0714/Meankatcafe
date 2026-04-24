import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createPasswordHash } from "@/lib/auth.js";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  is_admin: z.boolean().optional(),
  is_approved: z.boolean().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid data." }, { status: 400 });

  const { email, password, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (email) updates.email = email.toLowerCase().trim();
  if (password) updates.password_hash = createPasswordHash(password);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("users")
    .update(updates)
    .eq("id", id)
    .select("id, email, is_admin, is_approved, created_at")
    .single();

  if (error) {
    const msg = error.message.includes("unique") ? "A user with that email already exists." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, user: data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawDeleteId } = await params;
  const id = rawDeleteId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  if (id === session.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .schema("meankatcafe")
    .from("users")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
