// The four How-to-Help blocks can each have an uploadable poster that pops up
// when its CTA is clicked. Shared by the admin upload UI, the upload API, and
// the public How to Help page so the slot keys always line up.

export type HelpPosterSlot = "adopt" | "volunteer" | "donate" | "events";

export const HELP_POSTER_SLOTS: ReadonlyArray<{ slot: HelpPosterSlot; label: string; cta: string }> = [
  { slot: "adopt", label: "Adoption process (pop-up infographic)", cta: "Start the Adoption Process" },
  { slot: "volunteer", label: "Volunteer process (pop-up infographic)", cta: "Apply to Volunteer" },
  { slot: "donate", label: "Donate — More Cats", cta: "Donate Now" },
  { slot: "events", label: "Events — With Us", cta: "See Upcoming Events" },
];

export const HELP_POSTER_SLOT_VALUES: HelpPosterSlot[] = HELP_POSTER_SLOTS.map((s) => s.slot);

export const posterUrlKey = (slot: string) => `${slot}_poster_url`;
export const posterPathKey = (slot: string) => `${slot}_poster_path`;

// The big block image (replaces the emoji icon next to each help block).
export const imageUrlKey = (slot: string) => `${slot}_image_url`;
export const imagePathKey = (slot: string) => `${slot}_image_path`;

export function slotForCta(cta: string): HelpPosterSlot | null {
  return HELP_POSTER_SLOTS.find((s) => s.cta === cta)?.slot ?? null;
}

// ── Multi-image support ──────────────────────────────────────────────────────
// A slot can hold several images (multi-page infographics). The full list lives
// in a JSON settings value; the legacy single url/path keys are kept in sync
// with the first image so anything still reading them keeps working.

export type HelpImage = { url: string; path: string };

export const posterListKey = (slot: string) => `${slot}_poster_list`;
export const imageListKey = (slot: string) => `${slot}_image_list`;

export function listKeyFor(slot: string, kind: string) {
  return kind === "image" ? imageListKey(slot) : posterListKey(slot);
}

export function parseHelpImages(raw: string | null | undefined): HelpImage[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        url: typeof x?.url === "string" ? x.url.trim() : "",
        path: typeof x?.path === "string" ? x.path.trim() : "",
      }))
      .filter((x) => x.url);
  } catch {
    return [];
  }
}

export function serializeHelpImages(images: HelpImage[]): string {
  return images.length ? JSON.stringify(images) : "";
}

/** Every image for a slot, falling back to the legacy single-image keys. */
export function helpImagesFor(
  settings: Record<string, string | undefined>,
  slot: string,
  kind: "poster" | "image",
): HelpImage[] {
  const list = parseHelpImages(settings[listKeyFor(slot, kind)]);
  if (list.length) return list;
  const url = (settings[kind === "image" ? imageUrlKey(slot) : posterUrlKey(slot)] ?? "").trim();
  const path = (settings[kind === "image" ? imagePathKey(slot) : posterPathKey(slot)] ?? "").trim();
  return url ? [{ url, path }] : [];
}
