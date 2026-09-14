import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Meet the Cats",
  description:
    "Meet the rescue cats of MeanKat Café in Durban — resident cats, adoptable cats and dual adoptions. Find your new best friend and start the adoption process.",
  alternates: { canonical: "/cats" },
};

export default function CatsRoute() {
  return (
    <Suspense>
      <SiteShell page="Cats" />
    </Suspense>
  );
}
