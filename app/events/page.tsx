import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming events at MeanKat Café in Durban — cat yoga, socials, adoption days and more. See what's on at Durban's cat café.",
  alternates: { canonical: "/events" },
};

export default function EventsRoute() {
  return (
    <Suspense>
      <SiteShell page="Events" />
    </Suspense>
  );
}
