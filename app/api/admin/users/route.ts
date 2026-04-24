import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createPasswordHash } from "@/lib/auth.js";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  is_admin: z.boolean().default(true),
  is_approved: z.boolean().default(true),
});

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("users")
    .select("id, email, is_admin, is_approved, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin || !session?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  const { email, password, is_admin, is_approved } = parsed.data;
  const password_hash = createPasswordHash(password);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("users")
    .insert({ email: email.toLowerCase().trim(), password_hash, is_admin, is_approved })
    .select("id, email, is_admin, is_approved, created_at")
    .single();

  if (error) {
    const msg = error.message.includes("unique") ? "A user with that email already exists." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data });
}
