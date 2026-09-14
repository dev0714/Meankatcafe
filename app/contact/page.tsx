import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteShell } from "../site-shell";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with MeanKat Café, 87 Smiso Nkwanyana Road, Morningside, Durban. Find us, message us or drop by for coffee and cats.",
  alternates: { canonical: "/contact" },
};

export default function ContactRoute() {
  return (
    <Suspense>
      <SiteShell page="Contact" />
    </Suspense>
  );
}
