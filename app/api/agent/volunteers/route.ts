import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkAgentAuth } from "@/lib/agent-auth";
import {
  VOLUNTEER_SECTIONS,
  VOLUNTEER_TERMS,
  normaliseVolunteerAnswers,
  validateVolunteerAnswers,
  type VolunteerAnswers,
} from "@/lib/volunteer";

// ───────────────────────────────────────────────────────────────
// Machine-to-machine volunteer API for an external AI agent.
//   GET  /api/agent/volunteers   → the questions to ask (form schema)
//   POST /api/agent/volunteers   → submit a completed application
// Auth: Authorization: Bearer <KEY>  (AGENT_API_KEY or BOOKING_API_KEY)
// ───────────────────────────────────────────────────────────────

// GET returns the application schema so the agent can guide the conversation:
// each field's key, label, type, whether it's required, and any options.
export async function GET(request: Request) {
  const unauth = checkAgentAuth(request);
  if (unauth) return unauth;

  return NextResponse.json({
    instructions:
      "Ask the applicant each field below in order. Collect answers keyed by 'key'. " +
      "For 'yesno' fields the answer must be exactly 'Yes' or 'No'. For 'checkboxes' send an array of chosen option strings. " +
      "The applicant must agree to the terms (send agree_terms: 'Yes'). Then POST { answers: { <key>: <value>, ... } } to this same URL.",
    sections: VOLUNTEER_SECTIONS,
    terms: VOLUNTEER_TERMS,
    agree_terms_field: { key: "agree_terms", label: "Do you agree to these terms?", kind: "yesno", required: true },
  });
}

export async function POST(request: Request) {
  const unauth = checkAgentAuth(request);
  if (unauth) return unauth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  // Accept either { answers: {...} } or the answers object directly.
  const raw = (("answers" in body && body.answers && typeof body.answers === "object")
    ? body.answers
    : body) as VolunteerAnswers;

  const answers = normaliseVolunteerAnswers(raw);
  const validationError = validateVolunteerAnswers(answers);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No backend configured." }, { status: 503 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("volunteer_applications")
    .insert({
      full_name: answers.full_name as string,
      email: answers.email as string,
      whatsapp_number: (answers.whatsapp_number as string) || null,
      suburb: (answers.suburb as string) || null,
      agree_terms: answers.agree_terms === "Yes",
      answers,
    })
    .select("id, full_name, email, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not submit the application." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    application: { id: data.id, fullName: data.full_name, email: data.email, createdAt: data.created_at },
  }, { status: 201 });
}
