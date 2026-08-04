// Shared schema for the volunteer application form.
// Used by the public form (app/page.tsx), the submit API (app/api/volunteer),
// and the admin portal (app/admin) so all three stay in sync.

export type VolunteerFieldKind = "text" | "email" | "textarea" | "yesno" | "checkboxes";

export type VolunteerField = {
  key: string;
  label: string;
  kind: VolunteerFieldKind;
  required?: boolean;
  options?: string[];
  allowOther?: boolean;
  placeholder?: string;
  help?: string;
};

export type VolunteerSection = {
  heading: string;
  intro?: string;
  fields: VolunteerField[];
};

export const VOLUNTEER_SECTIONS: VolunteerSection[] = [
  {
    heading: "Your details 🐾",
    fields: [
      { key: "full_name", label: "Name and surname", kind: "text", required: true, placeholder: "Maahira Essack" },
      { key: "email", label: "Email", kind: "email", required: true, placeholder: "you@example.com" },
      { key: "age", label: "Age", kind: "text", required: true, placeholder: "e.g. 24" },
      { key: "whatsapp_number", label: "WhatsApp number", kind: "text", required: true, placeholder: "+27 ..." },
      { key: "suburb", label: "Suburb", kind: "text", required: true, placeholder: "Morningside" },
      { key: "emergency_contact", label: "Emergency contact name & number", kind: "text", required: true, placeholder: "Name — +27 ..." },
    ],
  },
  {
    heading: "Your availability 📅",
    fields: [
      {
        key: "availability",
        label: "When are you available?",
        kind: "checkboxes",
        required: true,
        options: ["Weekdays", "Weekends", "Public holidays"],
        allowOther: true,
      },
    ],
  },
  {
    heading: "Cat experience 🐱",
    fields: [
      { key: "owned_cats_before", label: "Have you ever owned cats before?", kind: "yesno", required: true },
      { key: "experience_description", label: "Describe your experience", kind: "textarea", placeholder: "Tell us about your experience with cats…" },
      { key: "afraid_of_cats", label: "Are you afraid of cats?", kind: "yesno", required: true },
      {
        key: "comfortable_with",
        label: "Which of these are you comfortable with?",
        kind: "checkboxes",
        options: [
          "Cleaning litter boxes",
          "Administering medication (supervised)",
          "Cleaning accidents",
          "Feeding",
          "Grooming",
          "Handling shy cats",
        ],
      },
    ],
  },
  {
    heading: "Getting around 🚗",
    intro: "These are not mandatory — they just help us know who to call when we need a hand.",
    fields: [
      { key: "has_car", label: "Do you have a car and can you drive?", kind: "yesno" },
      { key: "willing_collect_supplies", label: "If yes, are you willing to help collect cat supplies or make emergency trips for anything cat-related?", kind: "yesno" },
      { key: "assist_vet_visits", label: "Are you able to assist with vet visits if ever needed?", kind: "yesno" },
    ],
  },
  {
    heading: "Keeping the cats safe 🛡️",
    fields: [
      { key: "correct_children", label: "Are you comfortable correcting children if they are running, chasing or handling cats roughly?", kind: "yesno", required: true },
      { key: "protect_cat_confident", label: "Are you confident stepping into uncomfortable situations to protect a cat?", kind: "yesno", required: true },
      { key: "intervene_fighting", label: "Are you able to intervene when cats are fighting?", kind: "yesno", required: true },
      { key: "assist_customers", label: "Are you comfortable assisting customers when cats are afraid, jumping on them or their food?", kind: "yesno", required: true },
      { key: "show_holding", label: "Can you show people how to comfortably hold a cat?", kind: "yesno", required: true },
      { key: "understand_safety", label: "Do you understand that cat safety is the top priority?", kind: "yesno", required: true },
    ],
  },
  {
    heading: "A little about you 💜",
    fields: [
      { key: "why_volunteer", label: "Why do you want to volunteer at MeanKat Café?", kind: "textarea", required: true, placeholder: "What draws you to MeanKat?" },
      { key: "self_description_stress", label: "How would you describe yourself in busy or stressful environments?", kind: "textarea", required: true, placeholder: "Tell us how you handle pressure…" },
    ],
  },
];

export const VOLUNTEER_FIELDS: VolunteerField[] = VOLUNTEER_SECTIONS.flatMap((s) => s.fields);

export const VOLUNTEER_TERMS = [
  "The cats' wellbeing is the highest priority",
  "I may be required to intervene with guests",
  "This is an unpaid volunteer position",
  "There is a 2-week probation period",
];

export const AGREE_TERMS_FIELD: VolunteerField = {
  key: "agree_terms",
  label: "Do you agree to these terms?",
  kind: "yesno",
  required: true,
};

// All answerable fields including the terms agreement, in display order.
export const VOLUNTEER_ALL_FIELDS: VolunteerField[] = [...VOLUNTEER_FIELDS, AGREE_TERMS_FIELD];

export type VolunteerAnswers = Record<string, string | string[]>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates answers against the schema. Returns an error message or null. */
export function validateVolunteerAnswers(answers: VolunteerAnswers): string | null {
  for (const field of VOLUNTEER_ALL_FIELDS) {
    const value = answers[field.key];
    if (field.kind === "checkboxes") {
      const arr = Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()) : [];
      if (field.required && arr.length === 0) return `Please answer: ${field.label}`;
    } else {
      const str = typeof value === "string" ? value.trim() : "";
      if (field.required && !str) return `Please answer: ${field.label}`;
      if (field.kind === "email" && str && !EMAIL_RE.test(str)) return "Please enter a valid email address.";
    }
  }
  if (answers.agree_terms !== "Yes") {
    return "You must agree to the volunteer terms before submitting.";
  }
  return null;
}

/** Normalises raw answers into the shape stored/displayed (trims, drops empties). */
export function normaliseVolunteerAnswers(raw: VolunteerAnswers): VolunteerAnswers {
  const out: VolunteerAnswers = {};
  for (const field of VOLUNTEER_ALL_FIELDS) {
    const value = raw[field.key];
    if (field.kind === "checkboxes") {
      out[field.key] = Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()) : [];
    } else {
      out[field.key] = typeof value === "string" ? value.trim() : "";
    }
  }
  return out;
}

export function answerToText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value && value.trim() ? value : "—";
}
