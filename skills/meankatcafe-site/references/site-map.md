# Site Map

## Stack

- Next.js 16 app router
- React 19 client page in `app/page.tsx`
- TypeScript
- Tailwind 4 base setup in `app/globals.css`
- Radix/shadcn-style UI primitives in `components/ui/`

## Main Files

- `app/page.tsx`: full single-page site, section switching, content arrays, inline styling
- `app/admin/page.tsx`: admin login and upload entry point
- `app/admin/admin-client.tsx`: client-side admin UI for login, upload, and preview
- `app/api/auth/*`: custom email/password session routes
- `app/api/admin/cats/route.ts`: admin-only cat upload endpoint
- `app/api/admin/cats/[id]/route.ts`: admin-only cat delete endpoint
- `app/api/cats/route.ts`: public cat feed for the site and admin preview
- `app/layout.tsx`: metadata, icons, analytics, root HTML shell
- `app/globals.css`: CSS variables and Tailwind base layer
- `public/`: logos, cat photos, founder image, menu images, icons
- `scripts/remove-white-bg.mjs`: image-processing utility for `public/logo.png`
- `references/supabase-schema.md`: table and storage expectations for Supabase
- `.env.example`: required environment variables for the admin flow

## Page Structure

The page uses local `page` state to switch between:

- `Home`
- `Menu`
- `Cats`
- `Story`
- `About`
- `Contact`

The nav buttons call `navigate()` and close the mobile drawer.

## Content Sources In `app/page.tsx`

- `navLinks`: top navigation labels
- `menuSections`: menu categories and prices
- `menuGroupMap`: filters for the menu section
- `cats`: featured cat profiles and image sets
- `BRAND`: site palette and core brand colors

## Supabase Flow

- Login checks the local `users` table with hashed passwords.
- The Supabase client is configured to use the `meankatcafe` schema by default.
- Approved admins get a signed session cookie.
- Admin uploads save the image file to Supabase Storage and insert a row into `cats`.
- Admins can remove uploaded cats from the preview/dashboard, which deletes the row and its storage asset.
- Public cats data comes from `app/api/cats`, then the client merges it with the resident defaults.
- For hosted Supabase, expose `meankatcafe` from the Dashboard API settings and apply the schema grants in `references/supabase-schema.md`; do not use `ALTER ROLE authenticator` in the SQL editor.

## Key Behaviors

- `useEffect(() => window.scrollTo(0, 0), [page])` resets scroll on section changes.
- The contact form is local state only; it sets `submitted` after all fields are filled.
- The cat cards support image selection per cat with local state.
- The menu section supports filter chips for grouped categories.

## Assets Present

- `public/logo.png`
- `public/founder-maahira.jpg`
- `public/janice-1.jpg`
- `public/janice-2.jpg`
- `public/riley-casual.jpg`
- `public/riley-staff.jpg`
- `public/smokey.jpg`
- `public/menu1.jpg`
- `public/menu2.jpg`

## Editing Notes

- This site is intentionally playful and cat-centric. Keep copy warm, cheeky, and concise.
- Preserve the purple/cream/gold palette unless the user asks for a redesign.
- If you add a new section or route, update both `navLinks` and this map.
- If you move content out of `app/page.tsx`, keep the source-of-truth data documented here.
- If you change the auth or upload model, update `references/supabase-schema.md` and `.env.example` together.
