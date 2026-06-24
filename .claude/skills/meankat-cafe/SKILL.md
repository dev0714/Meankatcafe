---
name: meankat-cafe
description: Working on the MeanKat Café website (Next.js + Supabase cat-café site with public marketing pages and an admin portal). Use this whenever editing this repo — it covers the build/deploy workflow, architecture, Supabase schema, the settings system, and project conventions.
---

# MeanKat Café — project guide

Durban cat-café website: a public marketing site (`app/page.tsx`, one big
client SPA) plus an admin portal (`app/admin/admin-client.tsx`) backed by
Supabase. Production: **https://meankatcafe.co.za**.

## Stack
- **Next.js 16** (App Router, route handlers, `"use client"` components), Turbopack.
- **Supabase** — schema `meankatcafe`, project `khojukxurlhjjgeeyobo`, storage bucket `cat-images`. Accessed **server-side only** via the service-role key (`lib/supabase.ts`). RLS is on (service role bypasses).
- Custom scrypt auth (`lib/auth.js`), signed-cookie sessions (`lib/session.ts`), RBAC in `lib/permissions.ts` (`getSessionForArea(area)`; roles `admin` | `volunteer`).

## Build & deploy workflow (follow exactly)
```bash
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 pnpm build
```
The TLS env var is required (Google Fonts fetch fails without it in the sandbox).
Build skips type validation; pre-existing menu `validator.ts` type errors are expected — ignore them.

Git flow — **develop on the dev branch, then merge to `main` to go live** (the user says "push to live" / "move to main"):
```bash
git checkout -- tsconfig.tsbuildinfo          # never commit this artifact
git add -A && git commit -m "..."
git push -u origin <dev-branch>
git checkout main && git merge --no-ff <dev-branch> -m "Merge: ..." && git push -u origin main
git checkout <dev-branch>
```
Always `pnpm build` before committing. Keep dev branch and `main` in lockstep.

## Key files
- `app/page.tsx` — entire public site (home, cats, book, menu, about, how-to-help, contact). Single client component; pages switch via `setPage`. Hardcoded content lives in consts near the top.
- `app/admin/admin-client.tsx` — the whole admin portal (huge). Tabs: cats, menu-images, settings, users, events, bookings, members, volunteers. Settings tab is sub-tabbed.
- `app/meankat.css` — all site styling. CSS vars at top (`--purple`, `--purple-dark`, `--lilac-pale`, `--yellow-soft`, `--ink`, `--cream`…). Buttons (`.btn`) need `!important` on border/bg/color to beat Tailwind preflight.
- `lib/` — `cats.ts`, `hours.ts` (+ `hours-server.ts`), `bookings.ts`, `membership.ts`, `permissions.ts`, `compress-image.ts`, `image-transform.ts`, `volunteer.ts`, `help-posters.ts`, `emojify.ts`.
- `references/supabase-schema.md` — source-of-truth schema notes. Update it when you change tables.
- `references/migrations/*.sql` — record every schema change here.

## Conventions that bite if ignored
- **Image uploads**: always run `compressImage` (`lib/compress-image.ts`, max 2000px JPEG q0.85) client-side before upload — serverless body limit is ~4.5MB.
- **Settings**: key/value `site_settings` table. Defaults are duplicated in BOTH `app/api/settings/route.ts` (`SETTINGS_DEFAULTS`) and `app/admin/admin-client.tsx` — keep them in sync. Save posts the whole settings object to `/api/admin/settings`.
- **Opening hours**: structured JSON in the `opening_hours` setting, parsed by `lib/hours.ts` (`parseWeek`, `DEFAULT_WEEK`, `slotsForDate(week, date)`, `groupWeek`). Drives the hours banner, Contact page, and booking slots. Server reads via `getOpeningWeek()` (`lib/hours-server.ts`).
- **Cats** are DB-as-source-of-truth (no hardcoded ghosts). Public `/api/cats` hides `hidden` cats; admin uses `/api/cats?all=1` (auth-gated). Per-cat fields: `tagline` (shown as "nickname" pill), `where_to_find`, `how_to_make_happy`, `hidden`.
- **Decorative display font** mangles punctuation — omit apostrophes in big headings (e.g. "cant" not "can't").
- **emojify** (`lib/emojify.ts`) turns `:shortcode:` into emoji for user-facing copy.
- Edits to a file require reading it first in-session.

## Bookings
- Public Book page → `POST /api/bookings` (auto-confirm, capacity = `bookings_per_slot` setting, default 6).
- Admin Bookings tab: calendar + per-day panel with manual add, **check-in** (`arrived_at` timestamp, shows when the guest's hour is up), and **head count** edits (`actual_party_size`). Block-outs in `booking_blocks`.
- Machine/agent API: `GET|POST /api/agent/bookings`, authed by `BOOKING_API_KEY` env var (Bearer or `x-api-key`). See `references/agent-booking-api.md`.

## Supabase from a session
Schema changes go through the Supabase MCP `apply_migration` when available
(connection is sometimes permission-gated/disconnected). When it's not, write
the SQL to `references/migrations/` and ask the user to run it in the Supabase
SQL editor. Production env vars (e.g. `BOOKING_API_KEY`) must be set by the
user on the hosting platform — they can't be set from a session.

## Tone of changes
Incremental, surgical edits matching the surrounding code style. The user
ships frequently and expects each change built + merged to `main` (live).
