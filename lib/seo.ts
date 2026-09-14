// Shared SEO constants. Keep the real-world details here so the metadata,
// sitemap and structured data never drift apart.

export const SITE_URL = "https://meankatcafe.co.za";
export const SITE_NAME = "MeanKat Café";
export const SITE_TAGLINE = "Durban's Premier Cat Café";

export const SITE_TITLE = `${SITE_NAME}: ${SITE_TAGLINE}`;

export const SITE_DESCRIPTION =
  "MeanKat Café is Durban's dedicated cat café and rescue sanctuary in Morningside. " +
  "Book a visit, meet our rescue cats, enjoy great coffee — and every cup helps a cat find a forever home.";

export const BUSINESS = {
  streetAddress: "87 Smiso Nkwanyana Road",
  suburb: "Morningside",
  city: "Durban",
  region: "KwaZulu-Natal",
  country: "ZA",
  postalCode: "4001",
  // Approximate coordinates for Morningside, Durban — refine if you have exact ones.
  latitude: -29.8319,
  longitude: 31.0125,
};

/**
 * Schema.org LocalBusiness markup. This is what powers rich results in Google
 * and is a big part of how AI assistants describe the café when someone asks
 * for things to do in Durban.
 */
export function businessJsonLd(opts: { email?: string; phone?: string; sameAs?: string[] } = {}) {
  const sameAs = (opts.sameAs ?? []).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "@id": `${SITE_URL}/#business`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/logo.png`,
    servesCuisine: "Coffee, Café",
    priceRange: "R",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: `${BUSINESS.suburb}, ${BUSINESS.city}`,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.phone ? { telephone: opts.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
