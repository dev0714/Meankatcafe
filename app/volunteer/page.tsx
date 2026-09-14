import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Volunteer With Us",
  description:
    "Volunteer at MeanKat Café in Durban — help care for rescue cats, support the café and be part of giving cats a second chance. Apply online.",
  alternates: { canonical: "/volunteer" },
};

export default function VolunteerRoute() {
  return (
    <Suspense>
      <SiteShell page="Volunteer" />
    </Suspense>
  );
}
