import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getEmailSettings, notifyEnabled, adminRecipient, sendMail } from "@/lib/email";
import { normaliseVolunteerAnswers, validateVolunteerAnswers, type VolunteerAnswers } from "@/lib/volunteer";

export async function POST(request: Request) {
  let body: VolunteerAnswers;
  try {
    body = (await request.json()) as VolunteerAnswers;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const answers = normaliseVolunteerAnswers(body);
  const validationError = validateVolunteerAnswers(answers);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // No backend configured (e.g. local/preview) — accept so the form still works.
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .schema("meankatcafe")
    .from("volunteer_applications")
    .insert({
      full_name: answers.full_name as string,
      email: answers.email as string,
      whatsapp_number: (answers.whatsapp_number as string) || null,
      suburb: (answers.suburb as string) || null,
      agree_terms: answers.agree_terms === "Yes",
      answers,
    });

  if (error) {
    console.error("Failed to store volunteer application:", error.message);
    return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 500 });
  }

  // Notify the admin (best-effort).
  try {
    const s = await getEmailSettings();
    const admin = adminRecipient(s);
    if (notifyEnabled(s, "volunteer") && admin) {
      const fullName = answers.full_name as string;
      await sendMail(
        {
          to: admin,
          subject: `Volunteer application — ${fullName}`,
          html: `<p>New volunteer application:</p><ul><li>Name: ${fullName}</li><li>Email: ${answers.email as string}</li><li>WhatsApp: ${(answers.whatsapp_number as string) || "—"}</li><li>Suburb: ${(answers.suburb as string) || "—"}</li></ul>`,
          replyTo: answers.email as string,
        },
        s,
      );
    }
  } catch {
    /* ignore email failures */
  }

  return NextResponse.json({ ok: true });
}
