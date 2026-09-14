import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { PAGE_PATHS, type Page } from "@/lib/site-routes";

// Each section is its own route, so each gets its own sitemap entry and can
// rank independently.
const PRIORITY: Partial<Record<Page, number>> = {
  Home: 1,
  Book: 0.9,
  Cats: 0.9,
  "How to Help": 0.8,
  Cafe: 0.8,
  About: 0.7,
  Events: 0.7,
  Membership: 0.6,
  Contact: 0.6,
  Volunteer: 0.6,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return (Object.keys(PAGE_PATHS) as Page[]).map((page) => ({
    url: `${SITE_URL}${PAGE_PATHS[page] === "/" ? "" : PAGE_PATHS[page]}`,
    lastModified: now,
    changeFrequency: page === "Events" || page === "Cats" ? "weekly" : "monthly",
    priority: PRIORITY[page] ?? 0.6,
  }));
}
