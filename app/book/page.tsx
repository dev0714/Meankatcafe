import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Book a Visit",
  description:
    "Book your visit to MeanKat Café in Morningside, Durban. Reserve a table, meet our rescue cats and enjoy great coffee — every visit helps a cat find a home.",
  alternates: { canonical: "/book" },
};

export default function BookRoute() {
  return (
    <Suspense>
      <SiteShell page="Book" />
    </Suspense>
  );
}
