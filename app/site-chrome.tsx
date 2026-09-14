"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav, Announcement, Footer } from "./site-shell";
import { type Page, pathForPage } from "@/lib/site-routes";

/**
 * Nav + announcement + footer around server-rendered content (the guides).
 * The section pages use SiteShell instead, which also picks the body.
 */
export function SiteChrome({ page, children }: { page: Page; children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const setPage = useCallback((p: Page) => { router.push(pathForPage(p)); }, [router]);

  return (
    <div className="mk-site">
      <Nav page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Announcement />
      {children}
      <Footer setPage={setPage} />
      <button className="sticky-book" onClick={() => setPage("Book")}>
        📅 Book a Visit
      </button>
    </div>
  );
}
