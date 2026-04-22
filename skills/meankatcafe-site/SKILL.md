---
name: meankatcafe-site
description: Project-specific guide for the MeanKat Cafe Next.js site in this folder. Use when editing the website's single-page section switcher, branding, menu, cat bios, story, contact copy, metadata, or local assets, or when you need to understand how the site is structured before making changes.
---

# Meankatcafe Site

## Overview

Use this skill for any work on the MeanKat Cafe website under `Websites/Meankatcafe`. The app is a mostly client-rendered Next.js 16 site where one page in `app/page.tsx` swaps between sections with local React state. Most content, layout, and styling live in that file, and the new admin flow lives beside it in `app/admin/` plus `app/api/`.

## First Look

Read `references/site-map.md` before changing the site. It summarizes the stack, sections, assets, editing rules, and the Supabase-backed admin flow.

## Working Rules

- Preserve the single-page navigation unless the user explicitly asks to restructure the site.
- Keep the brand feel: cream, purple, gold, playful cat-cafe voice, and Durban/Morningside context.
- Update content in the source arrays and objects in `app/page.tsx` first, then adjust the JSX if needed.
- Keep static assets in `public/` and reuse existing cat, logo, founder, and menu images when possible.
- Treat the contact form as client-side only; it sets local state and does not submit to a backend.
- The admin login uses the local `users` table plus a signed session cookie; it does not use Supabase Auth.
- Cat uploads write image files to the Supabase Storage bucket and save the bucket path in the `cats` table.
- Public cats are merged from the built-in resident defaults and the database-backed list returned by `app/api/cats`.
- `app/globals.css` is mostly base theme plumbing. Most visual styling lives inline in `app/page.tsx`.
- `scripts/remove-white-bg.mjs` rewrites `public/logo.png`; run it only when intentionally regenerating that asset.

## Common Edits

- Menu updates: edit `menuSections` and `menuGroupMap`.
- Cat updates: edit `cats` and the matching `public/` image files.
- Admin/auth updates: edit `app/admin/`, `app/api/auth/`, `app/api/admin/cats/`, and `references/supabase-schema.md`.
- Navigation or section copy: edit `navLinks` and the section JSX in `app/page.tsx`.
- Site metadata or icons: edit `app/layout.tsx`.
- Shared CSS tokens and Tailwind base setup: edit `app/globals.css`.

## Change Checklist

- Check mobile behavior after any layout or content change.
- Keep copy concise and in the same tone as the existing site.
- If you split the page into routes or components, document the new structure in `references/site-map.md`.
