import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "The Café & Menu",
  description:
    "Coffee, croissants and sweet treats at MeanKat Café in Morningside, Durban. See our menu, entrance fees and opening hours — and sip alongside rescue cats.",
  alternates: { canonical: "/cafe" },
};

export default function CafeRoute() {
  return (
    <Suspense>
      <SiteShell page="Cafe" />
    </Suspense>
  );
}
