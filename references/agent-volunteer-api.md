# Volunteer API (for AI agents)

Lets the bot run the volunteer sign-up conversation and submit the
application — it lands in the admin **Volunteers** tab like a web submission.

## Auth
`Authorization: Bearer <KEY>` (the `AGENT_API_KEY` / `BOOKING_API_KEY` value).
Same key as the bookings + chat endpoints.

## 1. Get the questions to ask
`GET https://www.meankatcafe.co.za/api/agent/volunteers`

Returns the form schema: `sections[]` (each with `fields[]` — `key`, `label`,
`kind`, `required`, `options`), the `terms`, and the `agree_terms_field`.
Field kinds:
- `text` / `email` / `textarea` → a string
- `yesno` → exactly `"Yes"` or `"No"`
- `checkboxes` → an array of chosen option strings

The agent should ask each field in order and collect answers keyed by `key`.

## 2. Submit the application
`POST https://www.meankatcafe.co.za/api/agent/volunteers`

Body — send the collected answers (either wrapped in `answers` or at top level):
```json
{
  "answers": {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "age": "27",
    "whatsapp_number": "+27 82 000 0000",
    "suburb": "Morningside",
    "emergency_contact": "John — +27 83 111 2222",
    "availability": ["Weekends", "Public holidays"],
    "owned_cats_before": "Yes",
    "experience_description": "Fostered kittens for 3 years",
    "afraid_of_cats": "No",
    "comfortable_with": ["Feeding", "Grooming"],
    "has_car": "Yes",
    "willing_collect_supplies": "Yes",
    "assist_vet_visits": "Yes",
    "correct_children": "Yes",
    "protect_cat_confident": "Yes",
    "intervene_fighting": "Yes",
    "assist_customers": "Yes",
    "show_holding": "Yes",
    "understand_safety": "Yes",
    "why_volunteer": "I love cats and want to help rescues",
    "self_description_stress": "Calm and organised under pressure",
    "agree_terms": "Yes"
  }
}
```

Required fields (the API rejects with `400` + a message if any are missing):
`full_name, email, age, whatsapp_number, suburb, emergency_contact,
availability, owned_cats_before, afraid_of_cats, correct_children,
protect_cat_confident, intervene_fighting, assist_customers, show_holding,
understand_safety, why_volunteer, self_description_stress`, and
`agree_terms` must be `"Yes"`.

Success (`201`):
```json
{ "ok": true, "application": { "id": "…", "fullName": "Jane Doe", "email": "jane@example.com", "createdAt": "…" } }
```

## Errors
| status | meaning |
|--------|---------|
| 400 | missing/invalid field (message says which), or terms not agreed |
| 401 | missing/invalid API key |
| 503 | no database configured |
