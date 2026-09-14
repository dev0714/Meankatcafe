// The public site's sections are real routes, so each one is indexed and ranked
// on its own. This map is the single source of truth, shared by the route files
// (server) and the site shell (client).

export type Page =
  | "Home" | "About" | "Cats" | "Cafe" | "Events"
  | "How to Help" | "Contact" | "Volunteer" | "Book" | "Membership" | "Guides";

export const PAGE_PATHS: Record<Page, string> = {
  Home: "/",
  Book: "/book",
  Cats: "/cats",
  About: "/about",
  "How to Help": "/how-to-help",
  Cafe: "/cafe",
  Events: "/events",
  Membership: "/membership",
  Contact: "/contact",
  Volunteer: "/volunteer",
  Guides: "/blog",
};

/** Order the sections appear in the nav. Book sits high — it is the primary action. */
export const NAV_LINKS: Page[] = [
  "Home", "Book", "Cats", "About", "How to Help", "Cafe", "Events", "Guides", "Membership", "Contact",
];

export function pathForPage(page: Page): string {
  return PAGE_PATHS[page] ?? "/";
}

// Legacy hash links (/#cats) still work — they redirect to the real route.
export const LEGACY_HASH_TO_PATH: Record<string, string> = {
  home: "/", about: "/about", cats: "/cats", cafe: "/cafe", events: "/events",
  "how-to-help": "/how-to-help", contact: "/contact", volunteer: "/volunteer",
  book: "/book", membership: "/membership",
};
