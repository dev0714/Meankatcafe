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

Keys: `entrance_fee_1_price`, `entrance_fee_1_label`, `entrance_fee_2_price`, `entrance_fee_2_label`, `entrance_fee_3_price`, `entrance_fee_3_label`, `entrance_fee_4_price`, `entrance_fee_4_label`, `stat_drinks`, `stat_desserts`, `opening_hours` (JSON `WeekHours`; see `lib/hours.ts` — drives the hours banner, Contact page, and booking slots).

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
  actual_party_size integer,          -- true head count recorded by volunteers (null = use party_size)
  arrived_at timestamptz,             -- check-in time stamped when a guest is marked arrived (null = not arrived)
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
  max_members integer not null default 1,   -- names included (1 = individual; >1 = family, e.g. Colony Cats = 4)
  extra_member_price text,                   -- per extra member beyond max_members, e.g. "R150"
  created_at timestamptz not null default now()
);
create table meankatcafe.members (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text,
  plan_id uuid references meankatcafe.membership_plans(id) on delete set null,
  plan_name text, price text,
  status text not null default 'pending' check (status in ('pending','active','cancelled')),
  valid_until date, member_code text not null unique, notes text,
  member_names jsonb,                         -- family member names (family plans)
  extra_members integer not null default 0,   -- paid members beyond the plan's included count
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
```

Public: `GET /api/membership/plans`, `POST /api/membership/apply` (pending),
`GET /api/membership/status?email=` (digital card). Admin (area `members`):
`/api/admin/members` (+`/[id]` PATCH actions activate/renew, DELETE) and
`/api/admin/membership-plans` (+`/[id]`). `members` is a volunteer-permittable area
(for door staff).

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

## Shop (products & orders)

Shared with the standalone shop app (`Meankatcafeshop`). Products are managed
from the café admin (Shop Products tab); orders placed in the shop are written
back here and shown in the café admin (Shop Orders tab). Prices in CENTS (ZAR).

- `products` — `id` (uuid), `slug` (unique), `name`, `category`, `price_cents`,
  `description`, `badge`, `emoji`, `tile_color`, `image_path` (bucket path under
  `products/`), `active`, `stock`, `sort`, `created_at`.
- `orders` — `id` (uuid), `reference` (unique, e.g. `MK482913`), `email`,
  `first_name`, `last_name`, `phone`, `fulfilment` (`ship`|`pickup`), `address`
  (jsonb, null for pickup), `subtotal_cents`, `shipping_cents`, `total_cents`,
  `status` (`pending`|`paid`|`fulfilled`|`cancelled`), `created_at`.
- `order_items` — `id`, `order_id` (fk → orders, cascade), `product_id`, `name`,
  `emoji`, `unit_price_cents`, `qty`.
- Migration: `references/migrations/2026-07-shop-products-and-orders.sql`.

Café app expectations:
- `app/api/products` returns the public catalogue (`?all=1` includes inactive, admin only)
- `app/api/admin/products` lists (GET) / creates (POST) products; `[id]` PATCH/DELETE
- `app/api/admin/orders` lists shop orders; `[id]` PATCH updates status
- Product photos upload to the `cat-images` bucket under `products/`
