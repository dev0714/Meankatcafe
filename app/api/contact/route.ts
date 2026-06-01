import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = asTrimmedString(body.name);
  const email = asTrimmedString(body.email);
  const message = asTrimmedString(body.message);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Persist to Supabase when configured; otherwise accept the message so the
  // form still works in local/preview environments without a backend.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .schema("meankatcafe")
        .from("contact_messages")
        .insert({ name, email, message });

      if (error) {
        // Don't fail the user-facing request if storage isn't set up yet.
        console.error("Failed to store contact message:", error.message);
      }
    } catch (err) {
      console.error("Contact message error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
