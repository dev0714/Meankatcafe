# Booking API (for AI agents / integrations)

A machine-to-machine endpoint to check availability and create bookings
without a logged-in session. Bookings created here are auto-confirmed and
show up in the admin Bookings calendar like any other.

## Auth

Send the API key on every request, either header works:

```
Authorization: Bearer <BOOKING_API_KEY>
# or
x-api-key: <BOOKING_API_KEY>
```

The key is the `BOOKING_API_KEY` environment variable set on the hosting
platform. Rotate by changing that env var (no code change needed).

## Base URL

```
https://<your-site-domain>/api/agent/bookings
```

## 1. Check availability

`GET /api/agent/bookings?date=YYYY-MM-DD`

```bash
curl -s "https://<your-site-domain>/api/agent/bookings?date=2026-07-01" \
  -H "Authorization: Bearer $BOOKING_API_KEY"
```

Response:

```json
{
  "date": "2026-07-01",
  "open": true,
  "limit": 6,
  "totalBooked": 2,
  "slots": [
    { "slot": "09:00", "booked": 0, "remaining": 6, "blocked": false },
    { "slot": "10:00", "booked": 2, "remaining": 4, "blocked": false }
  ]
}
```

Pick any slot where `remaining > 0` and `blocked` is false.

## 2. Create a booking

`POST /api/agent/bookings`  (Content-Type: application/json)

| field      | type   | required | notes                          |
|------------|--------|----------|--------------------------------|
| date       | string | yes      | `YYYY-MM-DD`, today or future  |
| slot       | string | yes      | `HH:MM` 24h, must be an open slot |
| name       | string | yes      | guest / booker name            |
| partySize  | number | no       | defaults 1 (1–50)              |
| email      | string | no       | validated if provided          |
| phone      | string | no       | free text                      |

```bash
curl -s -X POST "https://<your-site-domain>/api/agent/bookings" \
  -H "Authorization: Bearer $BOOKING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "date": "2026-07-01",
        "slot": "10:00",
        "name": "Andre D",
        "partySize": 2,
        "email": "guest@example.com",
        "phone": "+27 82 000 0000"
      }'
```

Success (`201`):

```json
{
  "ok": true,
  "booking": {
    "id": "…uuid…",
    "date": "2026-07-01",
    "slot": "10:00",
    "name": "Andre D",
    "email": "guest@example.com",
    "phone": "+27 82 000 0000",
    "partySize": 2,
    "status": "confirmed",
    "createdAt": "2026-06-24T…Z"
  }
}
```

## Error codes

| status | meaning                                                        |
|--------|----------------------------------------------------------------|
| 400    | bad/missing fields (date format, slot format, invalid email)   |
| 401    | missing/invalid API key                                        |
| 409    | not open at that time / slot full / inside a private block-out |
| 503    | `BOOKING_API_KEY` not set, or no database configured           |

Capacity, opening hours, and admin block-outs are all enforced — the same
rules as the public Book page.
