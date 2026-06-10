# Supabase Schema

## Schema

Create a dedicated schema for the site:

```sql
create schema if not exists meankatcafe;
```

Expose it in Supabase API settings, then grant access:

```sql
grant usage on schema meankatcafe to anon, authenticated, service_role;
grant all on all tables in schema meankatcafe to anon, authenticated, service_role;
grant all on all routines in schema meankatcafe to anon, authenticated, service_role;
grant all on all sequences in schema meankatcafe to anon, authenticated, service_role;

alter default privileges in schema meankatcafe
grant all on tables to anon, authenticated, service_role;

alter default privileges in schema meankatcafe
grant all on sequences to anon, authenticated, service_role;
```

On hosted Supabase, do not try to run `ALTER ROLE authenticator ...` in the SQL editor. The `authenticator` role is reserved there, so schema exposure should be handled from the Dashboard API settings plus the grants above.

## Tables

### users

Use this table for site admins. Do not store plaintext passwords.

```sql
create table meankatcafe.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_admin boolean not null default false,
  is_approved boolean not null default false,
  role text not null default 'admin' check (role in ('admin','volunteer')),
  created_at timestamptz not null default now()
);
```

`role` gates admin access: `admin` = full access; `volunteer` = limited to the
areas listed in the `volunteer_permissions` setting (comma-separated:
`cats,events,bookings,volunteers`). Enforcement is server-side via
`lib/permissions.ts` (`getSessionForArea`), applied to the cats/events/bookings/
volunteers admin routes; all other admin routes remain admin-only. Volunteers
are never `is_admin = true`.

### cats

Store cat metadata here. Images live in Supabase Storage.

```sql
create table meankatcafe.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null check (category in ('resident', 'adoptable', 'dual', 'tlc', 'other')),
  image_path text not null,
  created_by uuid references meankatcafe.users(id),
  created_at timestamptz not null default now()
);
```

### menu_images

Menu/food photos shown in the carousel on the public Menu page.

```sql
create table meankatcafe.menu_images (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  created_by uuid references meankatcafe.users(id),
  created_at timestamptz not null default now()
);
```

### menu_sections

Menu categories (Coffee, Lattes, Desserts, etc.).

```sql
create table meankatcafe.menu_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🍽️',
  filter_group text not null default 'Other',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
```

### menu_items

Individual items within each section.

```sql
create table meankatcafe.menu_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references meankatcafe.menu_sections(id) on delete cascade,
  name text not null,
  price text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
```

### site_settings

Key-value store for editable site content (entrance fees, stats, hours).

```sql
create table meankatcafe.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

Keys: `entrance_fee_1_price`, `entrance_fee_1_label`, `entrance_fee_2_price`, `entrance_fee_2_label`, `entrance_fee_3_price`, `entrance_fee_3_label`, `entrance_fee_4_price`, `entrance_fee_4_label`, `stat_drinks`, `stat_desserts`, `hours_weekday`, `hours_saturday`, `hours_sunday`, `hours_contact_weekday`, `hours_contact_weekend`.

### contact_messages

Stores submissions from the public Contact form (`app/api/contact`). The route
degrades gracefully — if this table is missing it still returns success — so the
form works before the table exists, and persists once it does.

```sql
create table meankatcafe.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);
```

### volunteer_applications

Stores submissions from the public "Apply to Volunteer" form (`app/api/volunteer`).
The full question/answer set is kept in the `answers` JSONB column, keyed by the
field keys defined in `lib/volunteer.ts` (the single source of truth shared by the
public form and the admin portal). A few fields are promoted to columns for quick
scanning. The admin "Volunteers" tab lists and expands these via `/api/admin/volunteers`.

```sql
create table meankatcafe.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  whatsapp_number text,
  suburb text,
  agree_terms boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index volunteer_applications_created_at_idx
  on meankatcafe.volunteer_applications (created_at desc);
```

### Image framing (crop / zoom / focal point)

Cat photos store a non-destructive framing transform applied as CSS on display
(both admin and public site, so it's WYSIWYG). Shape: `{ "zoom": number, "x": number, "y": number }`
where `x`/`y` are focal-point percentages (0–100); `null` means default/centre.

```sql
alter table meankatcafe.cats add column image_transform jsonb;         -- primary ("after") photo
alter table meankatcafe.cats add column before_image_transform jsonb;  -- legacy before photo
alter table meankatcafe.cat_images add column transform jsonb;         -- each extra after/before photo
```

Edited via `PATCH /api/admin/cats/[id]` (primary/legacy, body `{ target, transform }`)
and `PATCH /api/admin/cats/[id]/images/[imageId]` (extras, body `{ transform }`).
Returned from `GET /api/cats` as `imageTransforms` / `beforeImageTransforms` arrays
parallel to `images` / `beforeImages`.

### bookings

Visit reservations from the public Book page. Capacity per hourly slot is the
`bookings_per_slot` site setting (default 6). Slots are derived from the café
opening hours in `lib/hours.ts`. Auto-confirmed on submit if the slot has space.

```sql
create table meankatcafe.bookings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot text not null,                 -- arrival hour, e.g. "14:00"
  name text not null,
  email text not null,
  phone text,
  party_size integer not null default 1,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);
create index bookings_date_slot_idx on meankatcafe.bookings (date, slot);
```

Endpoints: `GET /api/bookings/availability?date=` (per-slot remaining + today's count),
`POST /api/bookings` (create, capacity-checked), `GET /api/admin/bookings` (calendar list),
`DELETE /api/admin/bookings/[id]` (cancel/free the slot). New setting key: `bookings_per_slot`.

### membership_plans & members

Monthly membership (e.g. "Student — R200/month, free entry"). Members are tracked
manually: admin marks paid which sets `valid_until = today + plan.period_months`.
A member is "active at the door" when `status = 'active'` and `valid_until >= today`.
Each member has a unique `member_code` (e.g. `MK-7F3KQ`) shown as their digital card.

```sql
create table meankatcafe.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null, price text not null,
  period_months integer not null default 1,
  description text, active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table meankatcafe.members (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text,
  plan_id uuid references meankatcafe.membership_plans(id) on delete set null,
  plan_name text, price text,
  status text not null default 'pending' check (status in ('pending','active','cancelled')),
  valid_until date, member_code text not null unique, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
```

Public: `GET /api/membership/plans`, `POST /api/membership/apply` (pending),
`GET /api/membership/status?email=` (digital card). Admin (area `members`):
`/api/admin/members` (+`/[id]` PATCH actions activate/renew, DELETE) and
`/api/admin/membership-plans` (+`/[id]`). `members` is a volunteer-permittable area
(for door staff).

## socialsync schema (Social Studio)

The Social Studio feature lives in its **own dedicated schema `socialsync`** (separate from
`meankatcafe`), in the same Supabase project. Create + expose it like the main schema:

```sql
create schema if not exists socialsync;
grant usage on schema socialsync to anon, authenticated, service_role;
grant all on all tables in schema socialsync to anon, authenticated, service_role;
grant all on all sequences in schema socialsync to anon, authenticated, service_role;
alter default privileges in schema socialsync grant all on tables to anon, authenticated, service_role;
alter default privileges in schema socialsync grant all on sequences to anon, authenticated, service_role;
```

RLS is **enabled with no policies** on all three tables — the app uses the service-role key
(which bypasses RLS), so server access works while anon/public access is blocked. Server routes
call `supabase.schema("socialsync")`. Add `socialsync` to the project's exposed schemas in
Supabase Dashboard → API settings.

```sql
-- Connected social channels; access_token / refresh_token are AES-256-GCM encrypted (lib/social/crypto.ts)
create table socialsync.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube','linkedin')),
  display_name text,
  external_id text,
  access_token text, refresh_token text, token_expires_at timestamptz, scopes text,
  connected_by uuid references meankatcafe.users(id),   -- cross-schema FK
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index social_accounts_platform_external_idx on socialsync.social_accounts (platform, external_id);

-- Composed posts (description -> AI caption + media)
create table socialsync.social_posts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null, caption text, image_path text, video_path text,
  status text not null default 'draft' check (status in ('draft','publishing','published','failed')),
  created_by uuid references meankatcafe.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_posts_created_at_idx on socialsync.social_posts (created_at desc);

-- Per-platform publish result for each post
create table socialsync.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references socialsync.social_posts(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube','linkedin')),
  status text not null default 'pending' check (status in ('pending','published','failed','skipped')),
  remote_id text, remote_url text, error text, posted_at timestamptz,
  created_at timestamptz not null default now()
);
create index social_post_targets_post_idx on socialsync.social_post_targets (post_id);
```

Generated images are stored in the `cat-images` bucket under the `social/` prefix.
Endpoints (admin area `social`): `POST /api/admin/social/generate` (caption + image + draft),
`GET /api/admin/social/posts` (history), `PATCH|DELETE /api/admin/social/posts/[id]`.

## Storage

- Bucket name: `cat-images`
- Cats: stored under `resident/`, `adoptable/`, or `dual/`
- Menu photos: stored under `menu/`
- Save the bucket path in the respective table's `image_path` column

## App Expectations

- `app/api/auth/login` checks `users`
- `app/api/admin/cats` uploads to Storage and inserts into `cats`
- `app/api/cats` returns public cat data
- `app/api/menu-images` returns menu carousel images (falls back to built-ins)
- `app/api/admin/menu-images` uploads menu photos
- `app/api/admin/menu-images/[id]` deletes a menu photo
- `app/api/menu` returns menu sections + items (falls back to hardcoded DEFAULT_MENU)
- `app/api/admin/menu/sections` creates a section
- `app/api/admin/menu/sections/[id]` deletes a section (cascade) or adds an item (POST)
- `app/api/admin/menu/items/[id]` deletes a single item
- `app/api/settings` returns all site settings (falls back to defaults)
- `app/api/admin/settings` upserts key-value settings (POST)
- `app/api/contact` accepts public Contact form submissions (POST); stores to `contact_messages` when Supabase is configured
- `app/api/volunteer` accepts public volunteer applications (POST); stores to `volunteer_applications`
- `app/api/admin/volunteers` lists volunteer applications (admin only); `app/api/admin/volunteers/[id]` deletes one
