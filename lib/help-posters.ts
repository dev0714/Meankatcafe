// The four How-to-Help blocks can each have an uploadable poster that pops up
// when its CTA is clicked. Shared by the admin upload UI, the upload API, and
// the public How to Help page so the slot keys always line up.

export type HelpPosterSlot = "adopt" | "volunteer" | "donate" | "events";

export const HELP_POSTER_SLOTS: ReadonlyArray<{ slot: HelpPosterSlot; label: string; cta: string }> = [
  { slot: "adopt", label: "Adopt — Forever Friend", cta: "Start the Adoption Process" },
  { slot: "volunteer", label: "Volunteer process (pop-up infographic)", cta: "Apply to Volunteer" },
  { slot: "donate", label: "Donate — More Cats", cta: "Donate Now" },
  { slot: "events", label: "Events — With Us", cta: "See Upcoming Events" },
];

export const HELP_POSTER_SLOT_VALUES: HelpPosterSlot[] = HELP_POSTER_SLOTS.map((s) => s.slot);

export const posterUrlKey = (slot: string) => `${slot}_poster_url`;
export const posterPathKey = (slot: string) => `${slot}_poster_path`;

export function slotForCta(cta: string): HelpPosterSlot | null {
  return HELP_POSTER_SLOTS.find((s) => s.cta === cta)?.slot ?? null;
}
