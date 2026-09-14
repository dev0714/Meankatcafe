import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "How to Help",
  description:
    "Support Durban's rescue cats: adopt, foster, volunteer, donate or shop with purpose. Every contribution goes straight to the cats at MeanKat Café.",
  alternates: { canonical: "/how-to-help" },
};

export default function HowToHelpRoute() {
  return (
    <Suspense>
      <SiteShell page="How to Help" />
    </Suspense>
  );
}
