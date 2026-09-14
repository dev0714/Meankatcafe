import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Become a MeanKat Café member and enjoy regular cat time in Durban. See membership plans, perks and pricing, and apply online.",
  alternates: { canonical: "/membership" },
};

export default function MembershipRoute() {
  return (
    <Suspense>
      <SiteShell page="Membership" />
    </Suspense>
  );
}
