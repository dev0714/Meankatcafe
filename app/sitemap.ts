import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { PAGE_PATHS, type Page } from "@/lib/site-routes";
import { getPosts } from "@/lib/blog-server";

// Each section is its own route, so each gets its own sitemap entry and can
// rank independently. Guides are added from the database.
const PRIORITY: Partial<Record<Page, number>> = {
  Home: 1,
  Book: 0.9,
  Cats: 0.9,
  "How to Help": 0.8,
  Cafe: 0.8,
  Guides: 0.8,
  About: 0.7,
  Events: 0.7,
  Membership: 0.6,
  Contact: 0.6,
  Volunteer: 0.6,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const sections: MetadataRoute.Sitemap = (Object.keys(PAGE_PATHS) as Page[]).map((page) => ({
    url: `${SITE_URL}${PAGE_PATHS[page] === "/" ? "" : PAGE_PATHS[page]}`,
    lastModified: now,
    changeFrequency: page === "Events" || page === "Cats" || page === "Guides" ? "weekly" : "monthly",
    priority: PRIORITY[page] ?? 0.6,
  }));

  let posts: MetadataRoute.Sitemap = [];
  try {
    posts = (await getPosts()).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // Sections alone are still a valid sitemap.
  }

  return [...sections, ...posts];
}
