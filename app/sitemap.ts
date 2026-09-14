import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The public site is currently one page with in-page sections, so there is a
// single indexable URL. If the sections become real routes (/cats, /book, …),
// add them here — that is what lets Google rank each one separately.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
