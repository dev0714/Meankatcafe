import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "The story behind MeanKat Café, Durban's dedicated cat café and rescue sanctuary in Morningside — who we are, why we exist and the cats at the heart of it.",
  alternates: { canonical: "/about" },
};

export default function AboutRoute() {
  return (
    <Suspense>
      <SiteShell page="About" />
    </Suspense>
  );
}
