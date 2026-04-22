# Supabase Schema

## Tables

### users

Use this table for site admins. Do not store plaintext passwords.

```sql
create table public.users (
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
create table public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null check (category in ('resident', 'other')),
  image_path text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
```

## Storage

- Bucket name: `cat-images`
- Store uploaded files under `resident/` or `other/`
- Save the bucket path in `cats.image_path`

## App Expectations

- `app/api/auth/login` checks `users`
- `app/api/admin/cats` uploads to Storage and inserts into `cats`
- `app/api/cats` returns public cat data for the site
