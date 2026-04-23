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
  created_at timestamptz not null default now()
);
```

### cats

Store cat metadata here. Images live in Supabase Storage.

```sql
create table meankatcafe.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null check (category in ('resident', 'adoptable', 'dual', 'other')),
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
