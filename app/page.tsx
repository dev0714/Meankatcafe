"use client";

import { useState, useEffect } from "react";
import { DEFAULT_CATS, mergeCatsByName, type CatCard } from "@/lib/cats";
import { emojify } from "@/lib/emojify";
import { transformToStyle } from "@/lib/image-transform";
import { todayInCafeTZ } from "@/lib/hours";
import { slotForCta, posterUrlKey, imageUrlKey } from "@/lib/help-posters";
import { isMemberActive, type MembershipPlan } from "@/lib/membership";
import type { DayAvailability } from "@/lib/bookings";
import {
  VOLUNTEER_SECTIONS,
  VOLUNTEER_TERMS,
  VOLUNTEER_ALL_FIELDS,
  type VolunteerAnswers,
  type VolunteerField,
} from "@/lib/volunteer";
import "./meankat.css";

// ─────────────────────────────────────────────────────────────
// TYPES & DEFAULTS
// ─────────────────────────────────────────────────────────────

type MenuImage = { id: string; url: string };

type SiteEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  imageUrl?: string | null;
};

type Page = "Home" | "About" | "Cats" | "Cafe" | "Events" | "How to Help" | "Contact" | "Volunteer" | "Book" | "Membership";

const NAV_LINKS: Page[] = [
  "Home",
  "About",
  "How to Help",
  "Cats",
  "Cafe",
  "Events",
  "Book",
  "Membership",
  "Contact",
];

const ENTRANCE_FEES: Array<[string, string]> = [
  ["R50", "Per person"],
  ["R40", "Students (weekdays) — card req."],
  ["R40", "Pensioners"],
  ["Free", "Children under 1 year"],
];

const HOURS: Array<[string, string]> = [
  ["MON", "CLOSED"],
  ["TUE – THU", "09:00 – 17:00"],
  ["FRI", "09:00 – 12:00 / 13:30 – 22:00"],
  ["SAT", "09:00 – 22:00"],
  ["SUN", "09:00 – 12:00"],
];

const PILLARS = [
  {
    icon: "📍",
    title: "Durban",
    body: (
      <>
        87 Smiso Nkwanyana Road
        <br />
        Morningside, Kwa-Zulu Natal.
      </>
    ),
    cta: "Directions",
    target: "Contact" as Page,
  },
  {
    icon: "☕",
    title: "Café",
    body: <>Coffee to milkshakes, croissants to cookies. Have a look!</>,
    cta: "View the Menu",
    target: "Cafe" as Page,
  },
  {
    icon: "🐱",
    title: "Rules",
    body: <>Please teach kiddies our cat hero rules before visiting.</>,
    cta: "Cat Hero Guide",
    target: "Cats" as Page,
  },
];

const HELP_ITEMS = [
  {
    emoji: "🐾",
    h: "Rescue & Rehabilitation",
    p: "We help provide rescued cats with safety, care, socialisation, enrichment, and lots of naps in sunny spots.",
  },
  {
    emoji: "🏡",
    h: "Foster & Adoption Support",
    p: "We work with rescue partners and fosters to help cats find loving forever homes (preferably with excellent snack budgets).",
  },
  {
    emoji: "🎉",
    h: "Community & Events",
    p: "From art days to movie nights and cat-themed events, MeanKat Café is built for cat people to connect, relax, and support rescue together.",
  },
];

const HOW_TO_HELP = [
  {
    icon: "🏡",
    title: "Adopt",
    body: "Our goal is to find safe, loving, forever homes for our rescue cats.",
    cta: "How to Adopt",
  },
  {
    icon: "🙌",
    title: "Volunteer",
    body: "Donate your time and become part of the MeanKat family.",
    cta: "Volunteer",
  },
  {
    icon: "💜",
    title: "Donate",
    body: "Support our cause with food, supplies, or financial donations.",
    cta: "Donate Now",
  },
  {
    icon: "🎉",
    title: "Events",
    body: "Be part of fun events that build our cat-loving community.",
    cta: "See Events",
  },
];

const RESCUE_SITUATIONS = [
  "Abandonment",
  "Neglect",
  "Illness or Injury",
  "Unsafe Living Conditions",
  "Lack of Proper Care",
];

const PERKS = [
  { icon: "🥣", title: "Quality Food" },
  { icon: "🩺", title: "Medical Care" },
  { icon: "🛏️", title: "Safe Space to Rest" },
  { icon: "🧸", title: "Enrichment & Play" },
  { icon: "🫶", title: "Love & Socialisation" },
  { icon: "🏡", title: "Loving New Family" },
];

const HELP_DETAIL = [
  {
    icon: "🏡",
    script: "Find your",
    title: "Fur-ever Friend",
    body: "Every cat at MeanKat is looking for a safe, loving fur-ever home. If you don't already have a cat at home, you'll be required to adopt two — so they always have a companion. And bonded pairs are never separated.",
    list: [
      "Adoption fees: R600 for a single cat · R500 per cat for a duo pair",
      "No cat at home yet? Two cats are adopted together for company",
      "Bonded pairs are always rehomed together — never split up",
      "Fees help cover rescue, care, sterilisation & medical costs",
      "All cats are vetted, vaccinated & sterilised",
      "Process: in-person chat → home check → application → perfect-match → take your furbaby home",
    ],
    cta: "Start the Adoption Process",
  },
  {
    icon: "🙌",
    script: "Lend us a",
    title: "Helping Paw",
    body: "Whether you can spare a few hours a week or just want to drop by and spend time socialising the cats, we'd love to have you on the MeanKat team.",
    list: [
      "Cat socialisation & enrichment shifts",
      "Café floor support during busy hours",
      "Event setup for cat-themed evenings",
      "Photography & social media help",
    ],
    cta: "Apply to Volunteer",
  },
  {
    icon: "💜",
    script: "Help us help",
    title: "More Cats",
    body: "Guest fees cover daily care, but vet bills, rescues from urgent situations, and ongoing rehabilitation always need extra support. Every rand goes straight to the cats.",
    list: [
      "Food, treats & litter donations always welcome",
      "Vet care contributions for rescues in need",
      "Toys, scratchers, beds & enrichment items",
      "Monthly recurring support for the bigger picture",
    ],
    cta: "Donate Now",
  },
  {
    icon: "🎉",
    script: "Come hang",
    title: "With Us",
    body: "We host weekly events designed for cat lovers and curious humans alike — from cat & canvas painting nights to movie evenings with the residents.",
    list: [
      "Cat & Canvas — paint with feline supervision",
      "Movie nights with snacks & cuddles",
      "Cat yoga in a calm, kitty-approved setting",
      "Special adoption days & community fundraisers",
    ],
    cta: "See Upcoming Events",
  },
];

const CAT_FILTERS = [
  { value: "All" as const, label: "All Cats" },
  { value: "resident" as const, label: "Resident Cats" },
  { value: "adoptable" as const, label: "Adoptable Cats" },
  { value: "dual" as const, label: "Dual Adoptions" },
  { value: "tlc" as const, label: "Extra TLC Cats" },
];

type CatFilter = "All" | "resident" | "adoptable" | "dual" | "tlc";

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function MeanKatCafe() {
  const [page, setPage] = useState<Page>("Home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<CatFilter>("All");
  const [helpTarget, setHelpTarget] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const goToAdoptable = () => { setCatFilter("adoptable"); setPage("Cats"); };
  const goToHelp = (section: string) => { setHelpTarget(section); setPage("How to Help"); };

  return (
    <div className="mk-site">
      <Nav page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Announcement />
      {page === "Home" && <HomePage setPage={setPage} goToHelp={goToHelp} />}
      {page === "About" && <AboutPage setPage={setPage} />}
      {page === "Cats" && <CatsPage setPage={setPage} initialFilter={catFilter} />}
      {page === "Cafe" && <CafePage setPage={setPage} />}
      {page === "Events" && <EventsPage setPage={setPage} />}
      {page === "How to Help" && <HowToHelpPage setPage={setPage} goToAdoptable={goToAdoptable} scrollTarget={helpTarget} clearScrollTarget={() => setHelpTarget(null)} />}
      {page === "Volunteer" && <VolunteerPage setPage={setPage} />}
      {page === "Book" && <BookPage setPage={setPage} />}
      {page === "Membership" && <MembershipPage setPage={setPage} />}
      {page === "Contact" && <ContactPage setPage={setPage} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NAV / ANNOUNCEMENT / HOURS / FOOTER
// ─────────────────────────────────────────────────────────────

function Nav({
  page,
  setPage,
  mobileOpen,
  setMobileOpen,
}: {
  page: Page;
  setPage: (p: Page) => void;
  mobileOpen: boolean;
  setMobileOpen: (b: boolean) => void;
}) {
  return (
    <nav className="nav" data-screen-label="Site Nav">
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => setPage("Home")}>
          <img src="/logo.png" alt="MeanKat Cafe" />
        </div>
        <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? "✕" : "☰"}
        </button>
        <div className={`nav-links ${mobileOpen ? "open" : ""}`}>
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href="#"
              className={`nav-link ${page === l ? "on" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setPage(l);
                setMobileOpen(false);
              }}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

const DEFAULT_ANNOUNCEMENT = "🎉 Banner for Updates / Events / Important Notices";

function Announcement() {
  const [text, setText] = useState(DEFAULT_ANNOUNCEMENT);
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(30);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, string> | null) => {
        if (!d) return;
        if (typeof d.announcement_text === "string") setText(d.announcement_text);
        if (typeof d.announcement_enabled === "string") setEnabled(d.announcement_enabled !== "false");
        const s = Number(d.announcement_speed);
        if (Number.isFinite(s) && s > 0) setSpeed(s);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Hidden by the admin (toggle off or text cleared).
  if (loaded && (!enabled || text.trim() === "")) return null;

  const group = Array.from({ length: 4 }, (_, i) => (
    <span className="announce-item" key={i}>{text}</span>
  ));

  return (
    <div className="announce" role="status" aria-label="Announcement">
      <div className="marquee" style={{ animationDuration: `${speed}s` }}>
        {group}
        {group}
      </div>
    </div>
  );
}

function HoursBar() {
  return (
    <div className="hours-bar">
      {HOURS.map(([d, t], i) => (
        <span key={d}>
          <strong>{d}:</strong> {t}
          {i < HOURS.length - 1 && <span className="sep">|</span>}
        </span>
      ))}
    </div>
  );
}

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.png" alt="MeanKat Cafe" />
          <p className="footer-p">
            Durban&apos;s first dedicated cat café &amp; rescue sanctuary. Coffee, cats &amp; second chances.
          </p>
        </div>
        <div>
          <div className="footer-h">Location</div>
          <p className="footer-p">
            87 Smiso Nkwanyana Road
            <br />
            Morningside, Durban
            <br />
            Kwa-Zulu Natal
          </p>
        </div>
        <div>
          <div className="footer-h">Non-Profit Charity</div>
          <p className="footer-p">
            MeanKat Cafe NPC
            <br />
            NPC 2025/784731/08
          </p>
        </div>
        <div>
          <div className="footer-h">Connect With Us</div>
          <div className="socials">
            <a className="social" href="https://instagram.com/meankatcafe_durban" aria-label="Instagram" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
            </a>
            <a className="social" href="https://facebook.com/" aria-label="Facebook" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5 3.66 9.15 8.44 9.93v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.9h-2.33V22c4.78-.78 8.43-4.92 8.43-9.93z"/></svg>
            </a>
            <a className="social" href="https://wa.me/" aria-label="WhatsApp" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.42 1.27 4.85L2 22l5.27-1.38A9.93 9.93 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18.27a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-3.13.82.83-3.05-.2-.31A8.27 8.27 0 1 1 12 20.27z"/></svg>
            </a>
            <a className="social" href="https://tiktok.com/@meankatcafe_durban" aria-label="TikTok" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.9 20.1a6.34 6.34 0 0 0 10.86-4.43V8.79a8.16 8.16 0 0 0 4.77 1.52V6.87a4.85 4.85 0 0 1-1.94-.18z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 MeanKat Cafe NPC · All rights reserved</span>
        <a href="/admin" onClick={(e) => e.stopPropagation()} style={{ color: "rgba(255,255,255,0.7)" }}>Admin</a>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────

function HomePage({ setPage, goToHelp }: { setPage: (p: Page) => void; goToHelp: (section: string) => void }) {
  const [heroImages, setHeroImages] = useState<MenuImage[]>([{ id: "hero", url: "/hero-cafe.png" }]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [catHero, setCatHero] = useState<MenuImage[]>([]);
  const [guide, setGuide] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cafe-images")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MenuImage[] | null) => { if (d && d.length > 0) setHeroImages(d); })
      .catch(() => {});
    fetch("/api/cat-hero-images")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MenuImage[] | null) => { if (d && d.length > 0) setCatHero(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const heroCount = heroImages.length;
  const heroPos = ((heroIdx % heroCount) + heroCount) % heroCount;

  return (
    <div data-screen-label="Home">
      <section className="hero">
        <div className="paws-layer paws-white" />
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-script">Welcome,</div>
            <h1 className="hero-title">Cat Lovers.</h1>
            <div className="hero-eyebrow">Meet your new favourite spot! 🐾</div>
            <p className="hero-body">
              Every coffee, croissant, and sweet treat helps support rescue cats through fostering, rehabilitation, care, and adoption while they wait for their forever humans.
            </p>
            <p className="hero-body">
              Whether you&apos;re here for cat cuddles, iced lattes, or accidentally falling in love with your future furry roommate, every visit helps give rescue cats the second chance they deserve.
            </p>
            <div className="hero-cta">
              <button className="btn btn-light" onClick={() => setPage("Book")}>Book a Visit</button>
              <button className="btn btn-outline" onClick={() => setPage("Cats")}>Meet the Cats</button>
              <button className="btn btn-outline" onClick={() => setPage("How to Help")}>Donate</button>
            </div>
          </div>
          <div className="hero-img-wrap">
            <div className="hero-track" style={{ transform: `translateX(-${heroPos * 100}%)` }}>
              {heroImages.map((im) => (
                <img key={im.id} className="hero-slide" src={im.url} alt="Inside MeanKat Café" />
              ))}
            </div>
            {heroCount > 1 && (
              <>
                <button className="carousel-arrow left" onClick={() => setHeroIdx((i) => i - 1)} aria-label="Previous photo">‹</button>
                <button className="carousel-arrow right" onClick={() => setHeroIdx((i) => i + 1)} aria-label="Next photo">›</button>
                <div className="hero-dots">
                  {heroImages.map((im, n) => (
                    <button key={im.id} className={`carousel-dot ${n === heroPos ? "on" : ""}`} onClick={() => setHeroIdx(n)} aria-label={`Photo ${n + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <HoursBar />

      <section className="visit-section">
        <div className="visit-inner">
          <div className="pricing-card">
            <div className="pricing-title">Visit the Cats 🐱</div>
            {ENTRANCE_FEES.map(([price, label]) => (
              <div className="pricing-row" key={label}>
                <span className="pricing-price">{price}</span>
                <span className="pricing-label">{label}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="tagline-eyebrow">Come for the vibes... ☕</div>
            <div className="tagline">
              Stay because a cat <br />
              <span className="accent">sat on your lap</span> &amp; now <br />
              you legally can&apos;t leave.
            </div>
            <button className="btn btn-purple" onClick={() => setPage("Book")}>Book a Visit</button>
          </div>
        </div>
      </section>

      <section className="pillars">
        <div className="pillars-inner">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <div className="pillar-icon">{p.icon}</div>
              <div className="pillar-title">{p.title}</div>
              <p className="pillar-body">{p.body}</p>
              {p.cta === "Directions" ? (
                <button className="btn btn-outline-dark" onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=87%20Smiso%20Nkwanyana%20Road%2C%20Morningside%2C%20Durban%2C%20KwaZulu-Natal", "_blank", "noopener")}>{p.cta}</button>
              ) : p.cta === "Cat Hero Guide" ? (
                <button className="btn btn-outline-dark" onClick={() => (catHero.length > 0 ? setGuide(0) : setPage("Cats"))}>{p.cta}</button>
              ) : (
                <button className="btn btn-outline-dark" onClick={() => setPage(p.target)}>{p.cta}</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="second-chances">
        <div className="paws-layer paws-purple" />
        <div className="second-inner">
          <div className="second-img">
            <img src="/janice-1.jpg" alt="Cat resting at MeanKat" />
          </div>
          <div>
            <h2 className="sc-title">Coffee, Cats<br />&amp; Second Chances.</h2>
            <div className="sc-sub">How your visit helps 💜</div>
            {HELP_ITEMS.map((item) => (
              <div className="help-item" key={item.h}>
                <div className="help-emoji">{item.emoji}</div>
                <div>
                  <div className="help-h">{item.h}</div>
                  <p className="help-p">{item.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="help-bar">
        <div className="paws-layer paws-white" />
        <div className="help-bar-inner">
          {HOW_TO_HELP.map((h) => (
            <div className="help-card" key={h.title}>
              <div className="help-card-icon">{h.icon}</div>
              <div className="help-card-title">{h.title}</div>
              <p className="help-card-body">{h.body}</p>
              <button className="btn btn-outline" onClick={() => {
                if (h.title === "Events") { setPage("Events"); return; }
                const target = h.title === "Donate" ? "ways-to-give" : `help-${h.title.toLowerCase()}`;
                goToHelp(target);
              }}>{h.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {guide !== null && catHero[guide] && (
        <div className="modal-backdrop" onClick={() => setGuide(null)}>
          <div className="modal-box menu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGuide(null)}>✕</button>
            <div className="menu-modal-stage">
              <img src={catHero[guide].url} alt="How to be a Cat Hero" className="menu-modal-img" />
              {catHero.length > 1 && (
                <>
                  <button className="carousel-arrow left" onClick={() => setGuide((g) => g === null ? g : (g - 1 + catHero.length) % catHero.length)} aria-label="Previous">‹</button>
                  <button className="carousel-arrow right" onClick={() => setGuide((g) => g === null ? g : (g + 1) % catHero.length)} aria-label="Next">›</button>
                </>
              )}
            </div>
            {catHero.length > 1 && (
              <div className="carousel-dots" style={{ marginTop: 12 }}>
                {catHero.map((im, n) => (
                  <button key={im.id} className={`carousel-dot ${n === guide ? "on" : ""}`} onClick={() => setGuide(n)} aria-label={`Page ${n + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────

function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  const [foster, setFoster] = useState<{ intro: string; list: { name: string; body: string }[] }>({ intro: "", list: [] });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, string> | null) => {
        if (!d) return;
        const list = (d.foster_list ?? "")
          .split("\n").map((l) => l.trim()).filter(Boolean)
          .map((line) => {
            const [name, body] = line.split("|").map((s) => s.trim());
            return { name: name || "", body: body || "" };
          })
          .filter((f) => f.name);
        setFoster({ intro: (d.foster_intro ?? "").trim(), list });
      })
      .catch(() => {});
  }, []);

  return (
    <div data-screen-label="About">
      <section className="about-hero">
        <div className="paws-layer paws-white" />
        <div className="about-hero-inner">
          <div className="about-img">
            <img src="/founder-maahira.jpg" alt="Maahira, founder of MeanKat Café" />
          </div>
          <div>
            <div className="about-script">How it all</div>
            <h1 className="about-title">Started...</h1>
            <div className="about-sub-h">Creating more second chances 🐱</div>
            <p className="about-p">
              After years of learning cat behaviour and understanding what makes them feel safe, our founder, Maahira, knew she wanted to do something bigger and more sustainable than just fostering a few cats at a time.
            </p>
            <p className="about-p">
              She recognized a key challenge in rescue work: when cats aren&apos;t adopted, fosters can&apos;t take in new rescues. The cycle of waiting never ends. That&apos;s when MeanKat Café was born — a feline sanctuary designed to help more rescue cats find loving homes.
            </p>
          </div>
        </div>
      </section>

      <section className="purrpose">
        <div className="purrpose-inner">
          <div className="purrpose-card">
            <div className="purrpose-h">Our Purr-pose 🐾</div>
            <p className="purrpose-p">Every cat at MeanKat Café is a rescue cat. Many come from situations involving:</p>
            <ul className="purrpose-list">
              {RESCUE_SITUATIONS.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div className="purrpose-card">
            <div className="purrpose-h">Our Goal Is Simple 💜</div>
            <p className="purrpose-p">
              Give rescue cats a loving environment where they can rest, recover and prepare for adoption — while connecting them with people who&apos;ll give them safe forever homes.
            </p>
            <p className="purrpose-p">
              Inspired by the incredible work of Suzanne Kunz from PMB Kitten Fostering &amp; Rescue, we work closely with local fosters on urgent rehoming cases. Guest entry fees go directly to food, vet care, and the cats&apos; overall well-being.
            </p>
            <button className="btn btn-purple" onClick={() => setPage("How to Help")}>Get Involved</button>
          </div>
        </div>
      </section>

      <section className="perks">
        <div className="perks-inner">
          <h2 className="perks-eyebrow">Perks of the MeanKat life:</h2>
          <div className="perks-grid">
            {PERKS.map((p) => (
              <div className="perk" key={p.title}>
                <div className="perk-icon">{p.icon}</div>
                <div className="perk-title">{p.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(foster.intro || foster.list.length > 0) && (
        <section className="foster">
          <div className="paws-layer paws-purple" />
          <div className="foster-inner">
            <div className="foster-head">
              <div className="about-script" style={{ display: "inline-block" }}>With thanks to our</div>
              <h2 className="foster-title">Foster Network 🐾</h2>
            </div>
            {foster.intro && <p className="foster-intro">{foster.intro}</p>}
            {foster.list.length > 0 && (
              <div className="foster-grid">
                {foster.list.map((f) => (
                  <div className="foster-card" key={f.name}>
                    <div className="foster-card-icon">🫶</div>
                    <div className="foster-card-name">{f.name}</div>
                    {f.body && <p className="foster-card-body">{f.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATS PAGE
// ─────────────────────────────────────────────────────────────

function CatsPage({ setPage, initialFilter = "All" }: { setPage: (p: Page) => void; initialFilter?: CatFilter }) {
  const [filter, setFilter] = useState<CatFilter>(initialFilter);
  const [cats, setCats] = useState<CatCard[]>(DEFAULT_CATS);
  const [modalCat, setModalCat] = useState<CatCard | null>(null);
  const [modalView, setModalView] = useState<"after" | "before">("after");
  const [modalIndex, setModalIndex] = useState(0);

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  useEffect(() => {
    fetch("/api/cats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CatCard[] | null) => {
        if (!data || data.length === 0) return;
        setCats((prev) => mergeCatsByName(prev, data));
      })
      .catch(() => {});
  }, []);

  const openCat = (cat: CatCard) => {
    setModalCat(cat);
    setModalView("after");
    setModalIndex(0);
  };

  const visible = filter === "All" ? cats : cats.filter((c) => c.category === filter);
  const labelFor = (cat: CatCard) =>
    cat.category === "resident" ? "Resident cat"
      : cat.category === "dual" ? "Dual adoption"
      : cat.category === "tlc" ? "Extra TLC cat"
      : "Adoptable cat";

  const hasBefore = !!(modalCat?.beforeImages && modalCat.beforeImages.length > 0);
  const activeImages = modalCat ? (modalView === "before" ? modalCat.beforeImages ?? [] : modalCat.images) : [];
  const activeTransforms = modalCat ? (modalView === "before" ? modalCat.beforeImageTransforms : modalCat.imageTransforms) : undefined;

  return (
    <div data-screen-label="Cats">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">The cat distribution</div>
          <h1 className="page-title">Headquarters</h1>
          <p className="page-sub">They run this place. We just make the coffee. Browse our resident cats, adoptable cats, and dual adoptions below.</p>
          <div className="filter-row">
            {CAT_FILTERS.map((f) => (
              <button key={f.value} className={`filter-pill ${filter === f.value ? "on" : ""}`} onClick={() => setFilter(f.value)}>{f.label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="cats-section">
        <div className="cats-inner">
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
              <p>No cats in this category right now — check back soon.</p>
            </div>
          ) : (
            <div className="cat-grid">
              {visible.map((cat) => (
                <div key={cat.id} className="cat-card" onClick={() => openCat(cat)}>
                  <div className="cat-photo-wrap">
                    <img src={cat.images[0]} alt={cat.name} style={transformToStyle(cat.imageTransforms?.[0])} />
                  </div>
                  <div className="cat-body">
                    <div className={`cat-tag tag-${cat.category}`}>{labelFor(cat)}</div>
                    <div className="cat-name">{cat.name}</div>
                    {cat.breed && <div className="cat-breed">{cat.breed}</div>}
                    {cat.mood && <div className="cat-mood">Currently: {cat.mood}</div>}
                    <p className="cat-desc">{emojify(cat.description).slice(0, 140)}{emojify(cat.description).length > 140 ? "…" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {modalCat && (
        <div className="modal-backdrop" onClick={() => setModalCat(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalCat(null)}>✕</button>

            {hasBefore && (
              <div className="ba-toggle">
                <button className={`ba-btn ${modalView === "after" ? "on" : ""}`} onClick={() => { setModalView("after"); setModalIndex(0); }}>After</button>
                <button className={`ba-btn ${modalView === "before" ? "on" : ""}`} onClick={() => { setModalView("before"); setModalIndex(0); }}>Before</button>
              </div>
            )}

            {activeImages[modalIndex] && (
              <div className="modal-img-wrap">
                <img src={activeImages[modalIndex]} alt={modalCat.name} style={transformToStyle(activeTransforms?.[modalIndex])} />
              </div>
            )}

            <div className={`cat-tag tag-${modalCat.category}`}>{labelFor(modalCat)}</div>
            <div className="cat-name" style={{ fontSize: 40, marginTop: 10 }}>{modalCat.name}</div>
            {modalCat.breed && <div className="cat-breed">{modalCat.breed}</div>}
            {modalCat.mood && <div className="cat-mood" style={{ marginTop: 10 }}>Currently: {modalCat.mood}</div>}
            <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.8, marginTop: 18 }}>{emojify(modalCat.description)}</p>

            {activeImages.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                {activeImages.map((src, i) => (
                  <div key={i} className={`modal-thumb ${i === modalIndex ? "on" : ""}`} onClick={() => setModalIndex(i)}>
                    <img src={src} alt={`${modalCat.name} ${i + 1}`} style={transformToStyle(activeTransforms?.[i])} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CAFE / MENU PAGE
// ─────────────────────────────────────────────────────────────

function PhotoCarousel({ images, label, emptyText, onZoom }: { images: MenuImage[]; label: string; emptyText: string; onZoom: (images: MenuImage[], index: number) => void }) {
  const [i, setI] = useState(0);
  const count = images.length;
  const idx = count ? ((i % count) + count) % count : 0;
  const cur = images[idx];
  const prev = () => setI((p) => p - 1);
  const next = () => setI((p) => p + 1);

  return (
    <div className="carousel">
      <div className="carousel-label">{label}</div>
      {count === 0 ? (
        <div className="carousel-stage carousel-empty">{emptyText}</div>
      ) : (
        <>
          <div className="carousel-stage">
            <img src={cur.url} alt={label} onClick={() => onZoom(images, idx)} />
            {count > 1 && (
              <>
                <button className="carousel-arrow left" onClick={prev} aria-label="Previous">‹</button>
                <button className="carousel-arrow right" onClick={next} aria-label="Next">›</button>
              </>
            )}
          </div>
          {count > 1 && (
            <div className="carousel-dots">
              {images.map((img, n) => (
                <button key={img.id} className={`carousel-dot ${n === idx ? "on" : ""}`} onClick={() => setI(n)} aria-label={`Image ${n + 1}`} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CafePage({ setPage }: { setPage: (p: Page) => void }) {
  const [menuImages, setMenuImages] = useState<MenuImage[]>([
    { id: "b1", url: "/menu1.jpg" },
    { id: "b2", url: "/menu2.jpg" },
  ]);
  const [ruleImages, setRuleImages] = useState<MenuImage[]>([]);
  const [zoom, setZoom] = useState<{ images: MenuImage[]; index: number } | null>(null);

  useEffect(() => {
    fetch("/api/menu-images")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MenuImage[] | null) => {
        if (!data || data.length === 0) return;
        try {
          const hidden: string[] = JSON.parse(window.localStorage.getItem("meankat_hidden_menu_images") ?? "[]");
          setMenuImages(data.filter((img) => !hidden.includes(img.id)));
        } catch {
          setMenuImages(data);
        }
      })
      .catch(() => {});

    fetch("/api/cafe-rules-images")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MenuImage[] | null) => { if (data && data.length > 0) setRuleImages(data); })
      .catch(() => {});
  }, []);

  return (
    <div data-screen-label="Cafe">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">What&apos;s on</div>
          <h1 className="page-title">Our Menu</h1>
          <p className="page-sub">Come for the cats, stay for the sweet treats, tasty savoury bites, fun milkshakes, coffee, matcha, and more. Everything is halaal, sourced from amazing local suppliers wherever possible &amp; served with a side of cat cuddles.</p>
        </div>
      </section>

      <section className="menu-photos-wrap">
        <div className="cafe-menu-inner">
          <div className="cafe-menu-grid">
            <PhotoCarousel images={menuImages} label="The menu ☕" emptyText="Menu photos are being updated — check back soon." onZoom={(imgs, index) => setZoom({ images: imgs, index })} />
            <PhotoCarousel images={ruleImages} label="Cafe rules 🐾" emptyText="Cafe rules coming soon — check back shortly." onZoom={(imgs, index) => setZoom({ images: imgs, index })} />
          </div>

          <div className="menu-fee-card">
            <div className="menu-fee-h">Don&apos;t forget the entrance fee 🐾</div>
            <div className="menu-fee-p">R50 per person · R40 students (weekdays, card req.) · R40 pensioners · Free for children under 1 year</div>
            <button className="btn btn-light" style={{ marginTop: 18 }} onClick={() => setPage("Book")}>Book Now</button>
          </div>
        </div>
      </section>

      {zoom && (
        <div className="modal-backdrop" onClick={() => setZoom(null)}>
          <div className="modal-box menu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setZoom(null)}>✕</button>
            <div className="menu-modal-stage">
              <img src={zoom.images[zoom.index].url} alt="MeanKat menu" className="menu-modal-img" />
              {zoom.images.length > 1 && (
                <>
                  <button className="carousel-arrow left" onClick={() => setZoom((z) => z && { ...z, index: (z.index - 1 + z.images.length) % z.images.length })} aria-label="Previous">‹</button>
                  <button className="carousel-arrow right" onClick={() => setZoom((z) => z && { ...z, index: (z.index + 1) % z.images.length })} aria-label="Next">›</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EVENTS PAGE
// ─────────────────────────────────────────────────────────────

function EventsPage({ setPage }: { setPage: (p: Page) => void }) {
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [poster, setPoster] = useState<SiteEvent | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => {});
  }, []);

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const today = new Date(new Date().toDateString());
  const upcoming = sorted.filter((e) => new Date(e.date) >= today);
  const past = sorted.filter((e) => new Date(e.date) < today);
  const ordered = [...upcoming, ...past.reverse()];

  return (
    <div data-screen-label="Events">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Upcoming</div>
          <h1 className="page-title">Events.</h1>
          <p className="page-sub">From cat yoga mornings to themed movie nights — there&apos;s always something brewing at MeanKat. Grab a spot before the cats do.</p>
        </div>
      </section>

      <section className="events-section">
        <div className="events-inner">
          {ordered.length === 0 ? (
            <div className="events-empty">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
              <div className="events-empty-h">No events right now</div>
              <p className="events-empty-p">Check back soon — the cats are plotting something.</p>
            </div>
          ) : (
            <div className="event-grid">
              {ordered.map((ev) => {
                const d = new Date(ev.date);
                const isPast = d < today;
                const day = d.toLocaleDateString("en-ZA", { day: "numeric" });
                const month = d.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase();
                const year = d.getFullYear();
                return (
                  <div className={`event-card ${isPast ? "past" : ""}`} key={ev.id}>
                    {ev.imageUrl && <img className="event-photo" src={ev.imageUrl} alt={ev.title} onClick={() => setPoster(ev)} />}
                    <div className="event-body">
                      <div className="event-date-chip">
                        <div className="event-day">{day}</div>
                        <div className="event-month">{month}</div>
                        <div className="event-year">{year}</div>
                      </div>
                      <div className="event-content">
                        <div className="event-title-row">
                          <h3 className="event-title">{ev.title}</h3>
                          {isPast && <span className="event-past">Past</span>}
                        </div>
                        {ev.time && <div className="event-time">🕐 {ev.time}</div>}
                        <p className="event-desc">{ev.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {poster && poster.imageUrl && (
        <div className="modal-backdrop" onClick={() => setPoster(null)}>
          <div className="modal-box menu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPoster(null)}>✕</button>
            <img src={poster.imageUrl} alt={poster.title} className="menu-modal-img" />
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOW TO HELP PAGE
// ─────────────────────────────────────────────────────────────

function HowToHelpPage({ setPage, goToAdoptable, scrollTarget, clearScrollTarget }: { setPage: (p: Page) => void; goToAdoptable: () => void; scrollTarget?: string | null; clearScrollTarget?: () => void }) {
  const [give, setGive] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, string> | null) => { if (d) setGive(d); })
      .catch(() => {});
  }, []);

  // Arrived here from a home shortcut → scroll straight to that section.
  useEffect(() => {
    if (!scrollTarget) return;
    const t = setTimeout(() => {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      clearScrollTarget?.();
    }, 120);
    return () => clearTimeout(t);
  }, [scrollTarget, clearScrollTarget]);

  const bankRows: Array<[string, string]> = [
    ["Account name", give.bank_account_name],
    ["Bank", give.bank_name],
    ["Account number", give.bank_account_number],
    ["Branch code", give.bank_branch_code],
    ["Account type", give.bank_account_type],
    ["Reference", give.bank_reference],
  ].filter(([, v]) => v && v.trim()) as Array<[string, string]>;

  const backabuddy = (give.backabuddy_links ?? "")
    .split("\n").map((l) => l.trim()).filter(Boolean)
    .map((line) => {
      const [a, b] = line.split("|").map((s) => s.trim());
      return b ? { label: a, url: b } : { label: a || "Back a Buddy", url: a };
    })
    .filter((x) => /^https?:\/\//.test(x.url));

  const wishlist = (give.donate_wishlist ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  const securePayUrl = (give.secure_pay_url ?? "").trim();
  const [poster, setPoster] = useState<string | null>(null);
  const [giveModal, setGiveModal] = useState<null | "bank" | "items" | "backabuddy">(null);

  const downloadPoster = async (url: string) => {
    const ext = (url.split("?")[0].split(".").pop() || "jpg").slice(0, 4);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `meankat-poster.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  const volunteerPoster = (give[posterUrlKey("volunteer")] ?? "").trim();
  const adoptPoster = (give[posterUrlKey("adopt")] ?? "").trim();

  const helpVisual = (h: (typeof HELP_DETAIL)[number]) => {
    const slot = slotForCta(h.cta);
    const img = slot ? (give[imageUrlKey(slot)] ?? "").trim() : "";
    return img
      ? <div className="help-icon-big help-img-frame"><img src={img} alt={h.title} /></div>
      : <div className="help-icon-big">{h.icon}</div>;
  };

  const handleCta = (cta: string) => {
    // Donate always scrolls to the three "Ways to Give" squares.
    if (cta === "Donate Now") {
      document.getElementById("ways-to-give")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // If a poster has been uploaded for this section, pop it up.
    const slot = slotForCta(cta);
    const posterUrl = slot ? (give[posterUrlKey(slot)] ?? "").trim() : "";
    if (posterUrl) return setPoster(posterUrl);

    // Otherwise fall back to the section's normal action.
    if (cta === "Apply to Volunteer") return setPage("Volunteer");
    if (cta === "See Upcoming Events") return setPage("Events");
    setPage("Contact");
  };

  return (
    <div data-screen-label="How to Help">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Become part</div>
          <h1 className="page-title">Of Their Story</h1>
          <p className="page-sub">Be part of our purr-pose. Adopt, donate, volunteer, or support our events — every contribution helps us rescue, care for, and rehome more cats in need.</p>
        </div>
      </section>

      <section className="give-section" id="ways-to-give">
        <div className="give-inner">
          <div className="give-head">
            <div className="help-script-tag">Ways to</div>
            <h2 className="help-h2">Give 💜</h2>
            <p className="help-text">Pick how you&apos;d like to help — every contribution goes straight to the cats.</p>
          </div>
          <div className="perks-grid give-squares">
            <button className="perk give-square" onClick={() => setGiveModal("bank")}>
              <div className="perk-icon">🏦</div>
              <div className="perk-title">Bank Transfer</div>
              <div className="give-square-sub">{securePayUrl ? "Direct EFT or secure online pay" : "Direct EFT"}</div>
            </button>
            <button className="perk give-square" onClick={() => setGiveModal("items")}>
              <div className="perk-icon">🎁</div>
              <div className="perk-title">Items Wishlist</div>
              <div className="give-square-sub">Things the cats need</div>
            </button>
            <button className="perk give-square" onClick={() => setGiveModal("backabuddy")}>
              <div className="perk-icon">🐾</div>
              <div className="perk-title">BackaBuddy</div>
              <div className="give-square-sub">Back a campaign</div>
            </button>
          </div>
        </div>
      </section>

      <section className="help-page">
        <div className="help-inner">
          {HELP_DETAIL.map((h, i) => (
            <div className={`help-block ${i % 2 === 1 ? "flip" : ""}`} key={h.title} id={`help-${slotForCta(h.cta) ?? i}`} style={{ scrollMarginTop: 90 }}>
              {i % 2 === 0 ? (
                <>
                  {helpVisual(h)}
                  <div>
                    <div className="help-script-tag">{h.script}</div>
                    <h2 className="help-h2">{h.title}</h2>
                    <p className="help-text">{h.body}</p>
                    <ul className="help-list">{h.list.map((li) => <li key={li}>{li}</li>)}</ul>
                    {h.cta === "Apply to Volunteer" ? (
                      <div className="help-cta-row">
                        <button className="btn btn-purple" onClick={() => setPage("Volunteer")}>Apply to Volunteer</button>
                        {volunteerPoster && <button className="btn btn-outline-dark" onClick={() => setPoster(volunteerPoster)}>Volunteer Process</button>}
                      </div>
                    ) : h.cta === "Start the Adoption Process" ? (
                      <div className="help-cta-row">
                        <button className="btn btn-purple" onClick={goToAdoptable}>Adopt a Cat</button>
                        {adoptPoster && <button className="btn btn-outline-dark" onClick={() => setPoster(adoptPoster)}>Adoption Process</button>}
                      </div>
                    ) : (
                      <button className="btn btn-purple" onClick={() => handleCta(h.cta)}>{h.cta}</button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="help-script-tag">{h.script}</div>
                    <h2 className="help-h2">{h.title}</h2>
                    <p className="help-text">{h.body}</p>
                    <ul className="help-list">{h.list.map((li) => <li key={li}>{li}</li>)}</ul>
                    {h.cta === "Apply to Volunteer" ? (
                      <div className="help-cta-row">
                        <button className="btn btn-purple" onClick={() => setPage("Volunteer")}>Apply to Volunteer</button>
                        {volunteerPoster && <button className="btn btn-outline-dark" onClick={() => setPoster(volunteerPoster)}>Volunteer Process</button>}
                      </div>
                    ) : h.cta === "Start the Adoption Process" ? (
                      <div className="help-cta-row">
                        <button className="btn btn-purple" onClick={goToAdoptable}>Adopt a Cat</button>
                        {adoptPoster && <button className="btn btn-outline-dark" onClick={() => setPoster(adoptPoster)}>Adoption Process</button>}
                      </div>
                    ) : (
                      <button className="btn btn-purple" onClick={() => handleCta(h.cta)}>{h.cta}</button>
                    )}
                  </div>
                  {helpVisual(h)}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {giveModal && (
        <div className="modal-backdrop" onClick={() => setGiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGiveModal(null)}>✕</button>

            {giveModal === "bank" && (
              <>
                <div className="give-h">🏦 Bank Transfer</div>
                {bankRows.length > 0 ? (
                  <table className="give-bank">
                    <tbody>
                      {bankRows.map(([label, value]) => (
                        <tr key={label}>
                          <td className="give-bank-label">{label}</td>
                          <td className="give-bank-value">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="give-sub">Banking details coming soon — please get in touch via the Contact page.</p>
                )}
                {securePayUrl && (
                  <a className="btn btn-purple" href={securePayUrl} target="_blank" rel="noopener" style={{ marginTop: 18, width: "100%" }}>🔒 Pay securely online</a>
                )}
              </>
            )}

            {giveModal === "items" && (
              <>
                <div className="give-h">🎁 Items Wishlist</div>
                <p className="give-sub">Drop these at the café or send via a delivery — always needed.</p>
                {wishlist.length > 0 ? (
                  <ul className="give-list">{wishlist.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p className="give-sub">Our wishlist is being updated — check back soon.</p>
                )}
              </>
            )}

            {giveModal === "backabuddy" && (
              <>
                <div className="give-h">🐾 BackaBuddy Campaigns</div>
                <p className="give-sub">Help us reach a specific goal — every share counts.</p>
                {backabuddy.length > 0 ? (
                  <div className="give-bab">
                    {backabuddy.map((b) => (
                      <a key={b.url} className="btn btn-purple" href={b.url} target="_blank" rel="noopener">{b.label}</a>
                    ))}
                  </div>
                ) : (
                  <p className="give-sub">No active campaigns right now — check back soon.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {poster && (
        <div className="modal-backdrop" onClick={() => setPoster(null)}>
          <div className="modal-box menu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPoster(null)}>✕</button>
            <img src={poster} alt="More info" className="menu-modal-img" />
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button className="btn btn-purple" onClick={() => downloadPoster(poster)}>⬇ Download</button>
            </div>
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MEMBERSHIP PAGE
// ─────────────────────────────────────────────────────────────

type MemberStatusResult = {
  found: boolean;
  name?: string;
  planName?: string | null;
  status?: "pending" | "active" | "cancelled";
  validUntil?: string | null;
  memberCode?: string;
};

function MembershipPage({ setPage }: { setPage: (p: Page) => void }) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", planId: "" });
  const [sending, setSending] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const [checkEmail, setCheckEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<MemberStatusResult | null>(null);

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MembershipPlan[]) => {
        setPlans(data);
        if (data.length > 0) setForm((f) => ({ ...f, planId: data[0].id }));
      })
      .catch(() => {});
  }, []);

  const apply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/membership/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      setApplied(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const check = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch(`/api/membership/status?email=${encodeURIComponent(checkEmail)}`);
      const data = await res.json().catch(() => ({ found: false }));
      setResult(data);
    } catch {
      setResult({ found: false });
    } finally {
      setChecking(false);
    }
  };

  const active = result?.found ? isMemberActive({ status: result.status ?? "pending", validUntil: result.validUntil ?? null }, todayInCafeTZ()) : false;

  return (
    <div data-screen-label="Membership">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Become a</div>
          <h1 className="page-title">Member</h1>
          <p className="page-sub">Visit as often as you like. Pay monthly, get free café entry all month — and help give rescue cats a second chance every time you pop in.</p>
        </div>
      </section>

      <section className="member-section">
        <div className="member-inner">
          <div className="member-grid">
            {/* Apply */}
            <div className="book-card" id="member-apply">
              <div className="contact-h">Apply for membership</div>
              {applied ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                  <p style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>Thanks! Your application is in. We&apos;ll confirm your membership once your first payment is received, and email you your member code.</p>
                  <button className="btn btn-outline-dark" style={{ marginTop: 16 }} onClick={() => setApplied(false)}>Apply again</button>
                </div>
              ) : (
                <form onSubmit={apply}>
                  {error && <div className="vol-error" style={{ marginBottom: 14 }}>{error}</div>}
                  <label className="field-label" htmlFor="m-name">Full name</label>
                  <input id="m-name" className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maahira Essack" />
                  <label className="field-label" htmlFor="m-email">Email</label>
                  <input id="m-email" className="input-field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                  <label className="field-label" htmlFor="m-phone">Phone / WhatsApp</label>
                  <input id="m-phone" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27 ..." />
                  {plans.length > 0 && (
                    <>
                      <label className="field-label" htmlFor="m-plan">Plan</label>
                      <select id="m-plan" className="input-field" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                        {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price}</option>)}
                      </select>
                    </>
                  )}
                  <button type="submit" className="btn btn-purple" disabled={sending} style={{ marginTop: 6, width: "100%" }}>{sending ? "Sending…" : "Apply Now"}</button>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>We&apos;ll be in touch with payment details. Membership activates once your payment is received.</p>
                </form>
              )}
            </div>

            {/* Check status / digital card */}
            <div className="book-card">
              <div className="contact-h">My membership card</div>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 14 }}>Already a member? Enter your email to see your status and code — show this at the door.</p>
              <form onSubmit={check} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input className="input-field" style={{ marginBottom: 0 }} type="email" required value={checkEmail} onChange={(e) => setCheckEmail(e.target.value)} placeholder="you@example.com" />
                <button type="submit" className="btn btn-purple" disabled={checking}>{checking ? "…" : "Check"}</button>
              </form>
              {result && (
                result.found ? (
                  <div className={`member-card ${active ? "active" : "inactive"}`}>
                    <div className="member-card-top">
                      <span className="member-card-brand">MeanKat Member</span>
                      <span className={`member-card-status ${active ? "on" : ""}`}>{active ? "ACTIVE" : (result.status === "pending" ? "PENDING" : "INACTIVE")}</span>
                    </div>
                    <div className="member-card-name">{result.name}</div>
                    {result.planName && <div className="member-card-plan">{result.planName}</div>}
                    <div className="member-card-code">{result.memberCode}</div>
                    <div className="member-card-valid">
                      {active && result.validUntil
                        ? `Valid until ${new Date(`${result.validUntil}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
                        : result.status === "pending" ? "Awaiting payment confirmation" : "Membership not active — please renew"}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>No membership found for that email. <button className="link-btn" onClick={() => document.getElementById("member-apply")?.scrollIntoView({ behavior: "smooth" })}>Apply here</button>.</p>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOOK A VISIT PAGE
// ─────────────────────────────────────────────────────────────

function formatSlot(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m ? `:${String(m).padStart(2, "0")}` : ""}${period}`;
}

function prettyDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}

function BookPage({ setPage }: { setPage: (p: Page) => void }) {
  const today = todayInCafeTZ();
  const [date, setDate] = useState(today);
  const [avail, setAvail] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", partySize: "1" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ date: string; slot: string } | null>(null);

  const loadAvailability = (d: string) => {
    setLoading(true);
    setSlot("");
    fetch(`/api/bookings/availability?date=${d}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DayAvailability | null) => setAvail(data))
      .catch(() => setAvail(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAvailability(date);
  }, [date]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!slot) { setError("Please pick an available time slot."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partySize: Number(form.partySize), date, slot }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      setConfirmed({ date, slot });
      setForm({ name: "", email: "", phone: "", partySize: "1" });
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      loadAvailability(date); // refresh in case the slot just filled
    } finally {
      setSending(false);
    }
  };

  const isToday = date === today;
  const totalRemaining = avail?.slots.reduce((s, x) => s + x.remaining, 0) ?? 0;

  return (
    <div data-screen-label="Book">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Book a</div>
          <h1 className="page-title">Visit.</h1>
          <p className="page-sub">Reserve your spot with the cats. Pick a day and an available time below — slots are limited, so the cats don&apos;t get overwhelmed.</p>
        </div>
      </section>

      <section className="book-section">
        <div className="book-inner">
          <div className="pricing-card" style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
            <div className="pricing-title">Visit the Cats 🐱</div>
            {ENTRANCE_FEES.map(([price, label]) => (
              <div className="pricing-row" key={label}>
                <span className="pricing-price">{price}</span>
                <span className="pricing-label">{label}</span>
              </div>
            ))}
          </div>
          {confirmed ? (
            <div className="vol-success" style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 54, marginBottom: 12 }}>🎉</div>
              <h2 className="vol-success-h">You&apos;re booked!</h2>
              <p className="vol-success-p">
                See you on <strong>{prettyDate(confirmed.date)}</strong> at <strong>{formatSlot(confirmed.slot)}</strong>.
                A little reminder: the entrance fee is payable on arrival, and please read our cat-hero rules before visiting.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
                <button className="btn btn-purple" onClick={() => { setConfirmed(null); loadAvailability(date); }}>Book Another</button>
                <button className="btn btn-outline-dark" onClick={() => setPage("Home")}>Back to Home</button>
              </div>
            </div>
          ) : (
            <>
              {/* Left: date + slots */}
              <div className="book-card">
                <div className="contact-h">Pick a day & time</div>

                <label className="field-label" htmlFor="book-date">Date</label>
                <input
                  id="book-date"
                  className="input-field"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value || today)}
                />

                {isToday && avail && avail.open && (
                  <div className="book-summary">
                    🐾 <strong>{avail.totalBooked}</strong> {avail.totalBooked === 1 ? "booking" : "bookings"} so far today · <strong>{totalRemaining}</strong> spaces still open
                  </div>
                )}

                <div style={{ marginTop: 18 }}>
                  <span className="field-label">Available times</span>
                  {loading ? (
                    <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Checking availability…</p>
                  ) : !avail || !avail.open ? (
                    <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                      We&apos;re closed on {prettyDate(date)}. Please choose another day. 🐱
                    </p>
                  ) : (
                    <div className="slot-grid">
                      {avail.slots.map((s) => {
                        const unavailable = s.blocked || s.remaining <= 0;
                        return (
                          <button
                            key={s.slot}
                            type="button"
                            className={`slot-chip ${slot === s.slot ? "on" : ""} ${unavailable ? "full" : ""}`}
                            disabled={unavailable}
                            onClick={() => setSlot(s.slot)}
                          >
                            <span className="slot-time">{formatSlot(s.slot)}</span>
                            <span className="slot-left">{s.blocked ? "Reserved" : s.remaining <= 0 ? "Full" : `${s.remaining} left`}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: details */}
              <div className="book-card">
                <div className="contact-h">Your details</div>
                {error && <div className="vol-error" style={{ marginBottom: 14 }}>{error}</div>}
                <form onSubmit={submit}>
                  <label className="field-label" htmlFor="bk-name">Full name</label>
                  <input id="bk-name" className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name and surname" />

                  <label className="field-label" htmlFor="bk-email">Email</label>
                  <input id="bk-email" className="input-field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />

                  <label className="field-label" htmlFor="bk-phone">Phone / WhatsApp</label>
                  <input id="bk-phone" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27 ..." />

                  <label className="field-label" htmlFor="bk-party">Number of guests</label>
                  <select id="bk-party" className="input-field" value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                    ))}
                  </select>

                  <div className="book-selected">
                    {slot
                      ? <>Booking for <strong>{prettyDate(date)}</strong> at <strong>{formatSlot(slot)}</strong></>
                      : <span style={{ color: "var(--ink-soft)" }}>Select a time slot on the left to continue.</span>}
                  </div>

                  <button type="submit" className="btn btn-purple" disabled={sending || !slot} style={{ marginTop: 8, width: "100%" }}>
                    {sending ? "Booking…" : "Confirm Booking"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VOLUNTEER PAGE
// ─────────────────────────────────────────────────────────────

function initialVolunteerAnswers(): VolunteerAnswers {
  const out: VolunteerAnswers = {};
  for (const f of VOLUNTEER_ALL_FIELDS) out[f.key] = f.kind === "checkboxes" ? [] : "";
  return out;
}

function VolunteerPage({ setPage }: { setPage: (p: Page) => void }) {
  const [answers, setAnswers] = useState<VolunteerAnswers>(initialVolunteerAnswers);
  const [otherAvailability, setOtherAvailability] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const setText = (key: string, value: string) => setAnswers((a) => ({ ...a, [key]: value }));

  const toggleCheckbox = (key: string, option: string) =>
    setAnswers((a) => {
      const current = Array.isArray(a[key]) ? (a[key] as string[]) : [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...a, [key]: next };
    });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSending(true);

    // Fold the free-text "Other" availability into the availability list.
    const payload: VolunteerAnswers = { ...answers };
    if (otherAvailability.trim()) {
      const list = Array.isArray(payload.availability) ? [...(payload.availability as string[])] : [];
      payload.availability = [...list, `Other: ${otherAvailability.trim()}`];
    }

    try {
      const res = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      setSent(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderField = (f: VolunteerField) => {
    if (f.kind === "textarea") {
      return (
        <div className="vol-field" key={f.key}>
          <label className="field-label" htmlFor={`v-${f.key}`}>{f.label}{f.required && <span className="req"> *</span>}</label>
          <textarea id={`v-${f.key}`} className="input-field" required={f.required} value={(answers[f.key] as string) ?? ""} onChange={(e) => setText(f.key, e.target.value)} placeholder={f.placeholder} />
        </div>
      );
    }
    if (f.kind === "yesno") {
      return (
        <div className="vol-field" key={f.key}>
          <span className="field-label">{f.label}{f.required && <span className="req"> *</span>}</span>
          <div className="radio-row">
            {["Yes", "No"].map((opt) => (
              <label key={opt} className={`radio-pill ${answers[f.key] === opt ? "on" : ""}`}>
                <input type="radio" name={f.key} value={opt} checked={answers[f.key] === opt} required={f.required} onChange={() => setText(f.key, opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    if (f.kind === "checkboxes") {
      const selected = Array.isArray(answers[f.key]) ? (answers[f.key] as string[]) : [];
      return (
        <div className="vol-field" key={f.key}>
          <span className="field-label">{f.label}{f.required && <span className="req"> *</span>}</span>
          <div className="check-grid">
            {(f.options ?? []).map((opt) => (
              <label key={opt} className={`check-item ${selected.includes(opt) ? "on" : ""}`}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleCheckbox(f.key, opt)} />
                {opt}
              </label>
            ))}
          </div>
          {f.allowOther && (
            <input className="input-field" style={{ marginTop: 10 }} value={otherAvailability} onChange={(e) => setOtherAvailability(e.target.value)} placeholder="Other (please specify)…" />
          )}
        </div>
      );
    }
    return (
      <div className="vol-field" key={f.key}>
        <label className="field-label" htmlFor={`v-${f.key}`}>{f.label}{f.required && <span className="req"> *</span>}</label>
        <input id={`v-${f.key}`} className="input-field" type={f.kind === "email" ? "email" : "text"} required={f.required} value={(answers[f.key] as string) ?? ""} onChange={(e) => setText(f.key, e.target.value)} placeholder={f.placeholder} />
      </div>
    );
  };

  return (
    <div data-screen-label="Volunteer">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Lend us a</div>
          <h1 className="page-title">Helping Paw.</h1>
          <p className="page-sub">Fill in the volunteer application below and our team will be in touch. Every paw on deck helps the cats.</p>
        </div>
      </section>

      <section className="vol-section">
        <div className="vol-inner">
          {sent ? (
            <div className="vol-success">
              <div style={{ fontSize: 54, marginBottom: 12 }}>🐾</div>
              <h2 className="vol-success-h">Application received!</h2>
              <p className="vol-success-p">Thanks for wanting to join the MeanKat family. We&apos;ll review your application and get back to you soon.</p>
              <button className="btn btn-purple" style={{ marginTop: 22 }} onClick={() => setPage("Home")}>Back to Home</button>
            </div>
          ) : (
            <form onSubmit={submit} className="vol-form">
              {error && <div className="vol-error">{error}</div>}

              {VOLUNTEER_SECTIONS.map((section) => (
                <div className="vol-block" key={section.heading}>
                  <h2 className="vol-heading">{section.heading}</h2>
                  {section.intro && <p className="vol-intro">{section.intro}</p>}
                  {section.fields.map(renderField)}
                </div>
              ))}

              <div className="vol-block">
                <h2 className="vol-heading">The fine print 📋</h2>
                <p className="vol-intro">By submitting this form, I understand that:</p>
                <ul className="vol-terms">
                  {VOLUNTEER_TERMS.map((t) => <li key={t}>{t}</li>)}
                </ul>
                <div className="vol-field">
                  <span className="field-label">Do you agree to these terms?<span className="req"> *</span></span>
                  <div className="radio-row">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className={`radio-pill ${answers.agree_terms === opt ? "on" : ""}`}>
                        <input type="radio" name="agree_terms" value={opt} checked={answers.agree_terms === opt} required onChange={() => setText("agree_terms", opt)} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-purple" disabled={sending} style={{ alignSelf: "flex-start" }}>
                {sending ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────────────────────────

function ContactPage({ setPage }: { setPage: (p: Page) => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      setSent(true);
      setTimeout(() => setSent(false), 4500);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-screen-label="Contact">
      <section className="page-header">
        <div className="paws-layer paws-white" />
        <div className="page-header-inner">
          <div className="page-script">Drop us</div>
          <h1 className="page-title">A Line.</h1>
          <p className="page-sub">Booking a visit, asking about adoption, organising an event, or just want to say hi — we&apos;d love to hear from you.</p>
        </div>
      </section>

      <HoursBar />

      <section className="contact-section">
        <div className="contact-inner">
          <div className="contact-card">
            <div className="contact-h">Find us 🐱</div>
            <div className="contact-info-row">
              <div className="contact-info-icon">📍</div>
              <div>
                <div className="contact-label">Location</div>
                <div className="contact-value">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=87%20Smiso%20Nkwanyana%20Road%2C%20Morningside%2C%20Durban%2C%20KwaZulu-Natal"
                    target="_blank"
                    rel="noopener"
                    className="map-link"
                  >
                    87 Smiso Nkwanyana Road<br />Morningside, Durban<br />Kwa-Zulu Natal
                    <span className="map-link-tag">📍 Open in Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="contact-info-row">
              <div className="contact-info-icon">⏰</div>
              <div>
                <div className="contact-label">Opening hours</div>
                <div className="contact-value">Mon: closed<br />Tue – Thu: 09:00 – 17:00<br />Fri: 09:00 – 12:00 / 13:30 – 22:00<br />Sat: 09:00 – 22:00<br />Sun: 09:00 – 12:00</div>
              </div>
            </div>
            <div className="contact-info-row">
              <div className="contact-info-icon">📞</div>
              <div>
                <div className="contact-label">Phone &amp; WhatsApp</div>
                <div className="contact-value">+27 (0)31 000 0000<br /><a href="https://wa.me/" style={{ color: "var(--purple-dark)", fontWeight: 700 }}>Chat on WhatsApp</a></div>
              </div>
            </div>
            <div className="contact-info-row">
              <div className="contact-info-icon">✉️</div>
              <div>
                <div className="contact-label">Email</div>
                <div className="contact-value">hello@meankatcafe.co.za</div>
              </div>
            </div>
            <div className="contact-info-row">
              <div className="contact-info-icon">💜</div>
              <div>
                <div className="contact-label">Socials</div>
                <div className="contact-value">@meankatcafe_durban on Instagram, TikTok &amp; Facebook</div>
              </div>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-h">Send a message</div>
            {sent && (
              <div style={{ background: "var(--yellow-soft)", color: "var(--purple-dark)", padding: "12px 16px", borderRadius: 12, marginBottom: 14, fontWeight: 800, fontSize: 14 }}>
                🐾 Got it — we&apos;ll get back to you within 24 hours.
              </div>
            )}
            {error && (
              <div style={{ background: "#fde2e2", color: "#9b2226", padding: "12px 16px", borderRadius: 12, marginBottom: 14, fontWeight: 800, fontSize: 14 }}>
                {error}
              </div>
            )}
            <form onSubmit={submit}>
              <label className="field-label" htmlFor="cf-name">Your name</label>
              <input id="cf-name" className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maahira Essack" />

              <label className="field-label" htmlFor="cf-email">Email</label>
              <input id="cf-email" className="input-field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />

              <label className="field-label" htmlFor="cf-msg">Message</label>
              <textarea id="cf-msg" className="input-field" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you&apos;d like to chat about..." />

              <button type="submit" className="btn btn-purple" style={{ marginTop: 6 }} disabled={sending}>{sending ? "Sending…" : "Send Message"}</button>
            </form>
          </div>
        </div>
      </section>

      <Footer setPage={setPage} />
    </div>
  );
}
