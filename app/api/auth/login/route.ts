import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, verifyPasswordHash, SESSION_COOKIE_NAME } from "@/lib/auth.js";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSessionSecret } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const email = parsed.data.email.trim().toLowerCase();
  const { data: user, error } = await supabase
    .schema("meankatcafe")
    .from("users")
    .select("id, email, password_hash, is_admin, is_approved")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Login lookup failed:", error);
    return NextResponse.json(
      {
        error: `Unable to read admin user record: ${error.message}`,
      },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json({ error: "No user found for that email." }, { status: 401 });
  }

  if (!user.password_hash) {
    return NextResponse.json({ error: "User row is missing a password hash." }, { status: 500 });
  }

  if (!user.is_admin || !user.is_approved) {
    return NextResponse.json({ error: "User is not approved as an admin." }, { status: 401 });
  }

  if (!verifyPasswordHash(parsed.data.password, user.password_hash)) {
    return NextResponse.json({ error: "Password does not match the stored hash." }, { status: 401 });
  }

  const token = createSessionToken(
    {
      userId: user.id,
      email: user.email,
      isAdmin: true,
      isApproved: true,
    },
    getSessionSecret(),
    60 * 60 * 24 * 7
  );

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      isAdmin: true,
      isApproved: true,
    },
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
