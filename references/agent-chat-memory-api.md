# WhatsApp AI chat memory API

Gives the WhatsApp bot a reliable memory keyed by **phone number** (text),
so it stops "forgetting" who it's talking to. This replaces the fragile
n8n chain of Supabase "Get a row / Get many rows / Create a row / Insert
chat" nodes that were failing with `invalid input syntax for type uuid:
"undefined"` (that error means a UUID lookup got an undefined id because the
contact had never been created).

With this API there are **no UUIDs to pass around** — you only ever send the
WhatsApp phone number, and the contact is created automatically on first
contact.

## Auth
`Authorization: Bearer <KEY>` or `x-api-key: <KEY>`, where `<KEY>` is the
`AGENT_API_KEY` (or `BOOKING_API_KEY`) environment variable. One key works
for both the chat and booking agent endpoints.

## Tables (already created in Supabase)
- `meankatcafe.wa_contacts` — one row per phone (`phone` unique), plus `name`,
  `ai_enabled`, `created_at`, `last_seen_at`.
- `meankatcafe.wa_messages` — `phone`, `role` (`user`|`assistant`|`system`),
  `content`, `created_at`. Indexed by `(phone, created_at)`.

## 1. Load memory (use at the START of the flow)
`GET /api/agent/chat?phone=<number>&limit=20`

Auto-creates the contact if new, returns recent history oldest→newest.

```bash
curl -s "https://meankatcafe.co.za/api/agent/chat?phone=27814049661&limit=20" \
  -H "Authorization: Bearer $AGENT_API_KEY"
```
```json
{
  "contact": { "id": "…", "phone": "27814049661", "name": null, "ai_enabled": true },
  "messages": [
    { "role": "user", "content": "hi", "created_at": "…" },
    { "role": "assistant", "content": "Hi! Thanks for reaching out…", "created_at": "…" }
  ]
}
```
Feed `messages` straight into the AI agent as prior context.

## 2. Save a message (call TWICE — once for the user msg, once for the AI reply)
`POST /api/agent/chat`  body:

| field   | required | notes                                  |
|---------|----------|----------------------------------------|
| phone   | yes      | digits are extracted automatically     |
| content | yes      | the message text (`message` also works)|
| role    | no       | `user` (default), `assistant`, `system`|
| name    | no       | updates the contact's display name     |

```bash
curl -s -X POST "https://meankatcafe.co.za/api/agent/chat" \
  -H "Authorization: Bearer $AGENT_API_KEY" -H "Content-Type: application/json" \
  -d '{ "phone": "27814049661", "role": "user", "content": "Im stressing over them", "name": "Ketan" }'
```

## Recommended n8n flow (replaces the broken node chain)
1. **WhatsApp trigger** → get `phone` + `text`.
2. **HTTP GET** `/api/agent/chat?phone={{phone}}` → memory.
3. **AI Agent** — system prompt + `messages` from step 2 + the new text.
   Set the agent's memory **session key = the phone number** (not a uuid).
4. **HTTP POST** `/api/agent/chat` `{phone, role:"user", content:text, name}`.
5. **Send** the reply via UltraMsg.
6. **HTTP POST** `/api/agent/chat` `{phone, role:"assistant", content:reply}`.

Phone is the only identifier anywhere — nothing can be `undefined`, so the
contact is always created and history always loads.

## Phone normalisation
The API strips everything except digits, so `+27 81 404 9661`, `27814049661`
and `081 404 9661`-style inputs need to be consistent. Prefer always sending
the full international form (e.g. `27814049661`) from n8n so one person maps
to one contact.
