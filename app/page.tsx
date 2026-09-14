import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "./site-shell";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomeRoute() {
  return (
    <Suspense>
      <SiteShell page="Home" />
    </Suspense>
  );
}
