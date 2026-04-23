"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { emojify } from "@/lib/emojify";
import { CAT_CATEGORY_OPTIONS, DEFAULT_CATS, categoryLabel, mergeCatsByName, type CatCard } from "@/lib/cats";
import { DEFAULT_MENU, type MenuSection } from "@/lib/menu";

const BRAND = {
  cream: "#f5f0d8",
  purple: "#9b8ec4",
  purpleDark: "#7a6fa8",
  purpleLight: "#c5bce0",
  yellow: "#f0d84a",
  text: "#3a3060",
  textLight: "#6b609a",
  white: "#fffef5",
};

  const navLinks = ["Home", "Menu", "Cats", "Story", "About", "Contact"];


function seededPawPrints() {
  let s = 2847;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  return Array.from({ length: 20 }, (_, i) => {
    const xr = rand();
    // Zone away from hero text column (≈18–55% x)
    const x = i % 3 === 0 ? xr * 16 : 56 + xr * 42;
    return {
      x,
      y: rand() * 90,
      r: rand() * 360 - 180,
      s: 0.55 + rand() * 0.95,
      o: 0.18 + rand() * 0.22,
    };
  });
}

const PAW_PRINTS = seededPawPrints();

export default function MeanKatCafe() {
  const [page, setPage] = useState("Home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState("All");
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [submitted, setSubmitted] = useState(false);
  const [selectedCatImage, setSelectedCatImage] = useState<Record<string, number>>({});
  const [catEntries, setCatEntries] = useState<CatCard[]>(DEFAULT_CATS);
  const [catFilter, setCatFilter] = useState<"All" | "resident" | "adoptable" | "dual">("All");
  const [modalCat, setModalCat] = useState<CatCard | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [menuData, setMenuData] = useState<MenuSection[]>(DEFAULT_MENU);
  const [menuImages, setMenuImages] = useState<{ id: string; url: string }[]>([{ id: "b1", url: "/menu1.jpg" }, { id: "b2", url: "/menu2.jpg" }]);
  const [menuModalImage, setMenuModalImage] = useState<{ id: string; url: string } | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragDistance = useRef(0);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => {
    const loadCats = async () => {
      const response = await fetch("/api/cats");
      if (!response.ok) {
        return;
      }

      const data = ((await response.json()) as Array<CatCard & { category: string }>).map(c => ({
        ...c,
        category: (c.category === "other" ? "adoptable" : c.category) as CatCard["category"],
      }));
      setCatEntries((current) => mergeCatsByName(current, data));
    };

    loadCats();
  }, []);

  useEffect(() => {
    fetch("/api/menu").then(r => r.ok ? r.json() : null).then((data: MenuSection[] | null) => {
      if (data && data.length > 0 && data[0].id) setMenuData(data);
    }).catch(() => {});
    fetch("/api/menu-images").then(r => r.ok ? r.json() : null).then((data) => {
      if (data && data.length > 0) {
        try {
          const hidden: string[] = JSON.parse(window.localStorage.getItem("meankat_hidden_menu_images") ?? "[]");
          setMenuImages(data.filter((img: { id: string }) => !hidden.includes(img.id)));
        } catch {
          setMenuImages(data);
        }
      }
    }).catch(() => {});
  }, []);

  const navigate = (p: string) => { setPage(p); setMobileOpen(false); };

  const menuGroups = [...new Set(menuData.map(s => s.filterGroup).filter(Boolean))];
  const visibleSections = menuFilter === "All"
    ? menuData
    : menuData.filter(s => s.filterGroup === menuFilter);
  const visibleCats = catFilter === "All"
    ? catEntries
    : catEntries.filter(cat => cat.category === catFilter);

  return (
    <div style={{ background: BRAND.cream, minHeight: "100vh", fontFamily: "'Nunito', sans-serif", color: BRAND.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f0d8; }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes fadeIn { 0% { opacity: 0; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes slideInRight { 0% { transform: translateX(20px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .mk-nav { background: none; border: none; cursor: pointer; font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #6b609a; padding: 6px 2px; transition: all 0.3s ease; border-bottom: 2px solid transparent; position: relative; }
        .mk-nav:hover, .mk-nav.on { color: #7a6fa8; border-bottom-color: #f0d84a; transform: scale(1.05); }
        .mk-primary { background: linear-gradient(135deg, #9b8ec4, #7a6fa8); color: white; border: none; border-radius: 100px; padding: 14px 32px; font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all 0.3s ease; font-weight: 700; box-shadow: 0 4px 15px rgba(155,142,196,0.25); }
        .mk-primary:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 28px rgba(155,142,196,0.4); }
        .mk-outline { background: transparent; color: #7a6fa8; border: 2px solid #9b8ec4; border-radius: 100px; padding: 12px 28px; font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all 0.3s ease; font-weight: 700; }
        .mk-outline:hover { background: linear-gradient(135deg, #9b8ec4, #7a6fa8); color: white; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(155,142,196,0.3); }
        .mk-card { background: #fffef5; border: 1.5px solid #c5bce0; border-radius: 16px; padding: 28px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; overflow: hidden; }
        .mk-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(240,216,74,0.03) 0%, rgba(155,142,196,0.03) 100%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .mk-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(155,142,196,0.22); border-color: #f0d84a; }
        .mk-card:hover::before { opacity: 1; }
        .mk-filter { background: transparent; border: 1.5px solid #c5bce0; border-radius: 100px; padding: 8px 20px; font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; color: #6b609a; transition: all 0.3s ease; font-weight: 700; }
        .mk-filter.on, .mk-filter:hover { background: linear-gradient(135deg, #9b8ec4, #7a6fa8); color: white; border-color: transparent; transform: scale(1.05); box-shadow: 0 6px 16px rgba(155,142,196,0.3); }
        .mk-input { width: 100%; border: 1.5px solid #c5bce0; border-radius: 10px; padding: 14px 16px; font-family: 'Nunito', sans-serif; font-size: 14px; background: #fffef5; color: #3a3060; outline: none; transition: all 0.3s ease; font-weight: 500; }
        .mk-input:focus { border-color: #f0d84a; box-shadow: 0 0 0 3px rgba(240,216,74,0.15); }
        .mk-input::placeholder { color: #c5bce0; }
        textarea.mk-input { resize: vertical; min-height: 130px; }
        .cat-desc-scroll {
          max-height: 170px;
          overflow-y: auto;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: #9b8ec4 rgba(155,142,196,0.15);
        }
        .cat-desc-scroll::-webkit-scrollbar { width: 8px; }
        .cat-desc-scroll::-webkit-scrollbar-track { background: rgba(155,142,196,0.12); border-radius: 999px; }
        .cat-desc-scroll::-webkit-scrollbar-thumb { background: #9b8ec4; border-radius: 999px; }
        .cat-desc-scroll::-webkit-scrollbar-thumb:hover { background: #7a6fa8; }
        .tag { font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
        .float-elem { animation: floatSlow 3s ease-in-out infinite; }
        @media (max-width: 768px) {
          .d-nav { display: none !important; }
          .m-btn { display: flex !important; }
          .two-col { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .m-btn { display: none !important; }
          .m-panel { display: none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: "rgba(245,240,216,0.95)", backdropFilter: "blur(14px)", borderBottom: "2px solid #f0d84a", padding: "0 clamp(16px, 5vw, 40px)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(155,142,196,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: "auto", minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div onClick={() => navigate("Home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "transform 0.3s" }}>
            <img src="/logo.png" alt="MeanKat Cafe" style={{ height: "clamp(60px, 12vw, 100px)", width: "auto", filter: "contrast(1.3) saturate(1.3) drop-shadow(0 2px 8px rgba(0,0,0,0.1))" }} />
          </div>
          <div className="d-nav" style={{ display: "flex", gap: 28 }}>
            {navLinks.map(l => <button key={l} className={`mk-nav ${page === l ? "on" : ""}`} onClick={() => navigate(l)}>{l}</button>)}
            <Link href="/admin" className="mk-nav" style={{ textDecoration: "none" }}>Admin</Link>
          </div>
          <button className="m-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: BRAND.text }}>
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="m-panel" style={{ borderTop: "2px solid #f0d84a", padding: "20px clamp(16px, 5vw, 40px)", display: "flex", flexDirection: "column", gap: 18, background: "rgba(240,216,74,0.05)" }}>
            {navLinks.map(l => <button key={l} className={`mk-nav ${page === l ? "on" : ""}`} onClick={() => navigate(l)}>{l}</button>)}
            <Link href="/admin" className="mk-nav" style={{ textDecoration: "none" }}>Admin</Link>
          </div>
        )}
      </nav>

      {/* ══════════ HOME ══════════ */}
      {page === "Home" && (
        <div>
          {/* Hero */}
          <div style={{ minHeight: "clamp(80vh, 100vh, 120vh)", display: "flex", alignItems: "center", padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 40px)", background: `linear-gradient(135deg, ${BRAND.cream} 0%, #e8e0f8 50%, #d8d0f0 100%)`, position: "relative", overflow: "hidden" }}>
            {/* Logo Background */}
            <img src="/logo.png" alt="" style={{ position: "absolute", top: "50%", right: "-10%", width: "clamp(300px, 60vw, 600px)", height: "auto", opacity: 0.08, transform: "translateY(-50%)", pointerEvents: "none", mixBlendMode: "multiply" }} />

            
            {/* Scattered paw prints — 5 purple ellipses per paw, each pad floats independently */}
            {PAW_PRINTS.map((p, i) => {
              const size = Math.round(100 * p.s);
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%,-50%) rotate(${p.r}deg)`,
                    opacity: p.o,
                    pointerEvents: "none",
                  }}
                >
                  {/* viewBox gives 8-10px gap between each pad — "apart" look */}
                  <svg width={size} height={size} viewBox="-60 -72 120 112" overflow="visible" style={{ display: "block" }}>
                    {/* main metacarpal pad */}
                    <ellipse cx="0" cy="20" rx="28" ry="22" fill={BRAND.purple}
                      style={{ animation: "floatSlow 3.0s ease-in-out infinite 0.0s" }}/>
                    {/* left outer toe */}
                    <ellipse cx="-38" cy="-22" rx="13" ry="15" fill={BRAND.purple}
                      style={{ animation: "floatSlow 3.3s ease-in-out infinite 0.3s" }}/>
                    {/* left inner toe */}
                    <ellipse cx="-14" cy="-47" rx="12" ry="14" fill={BRAND.purple}
                      style={{ animation: "floatSlow 2.8s ease-in-out infinite 0.6s" }}/>
                    {/* right inner toe */}
                    <ellipse cx="14" cy="-47" rx="12" ry="14" fill={BRAND.purple}
                      style={{ animation: "floatSlow 3.1s ease-in-out infinite 0.9s" }}/>
                    {/* right outer toe */}
                    <ellipse cx="38" cy="-22" rx="13" ry="15" fill={BRAND.purple}
                      style={{ animation: "floatSlow 2.9s ease-in-out infinite 1.2s" }}/>
                  </svg>
                </div>
              );
            })}

            {/* Decorative elements */}
            <div style={{ position: "absolute", top: "8%", right: "6%", width: 120, height: 120, background: "linear-gradient(135deg, #f0d84a, #fce4a3)", borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%", opacity: 0.15, animation: "floatSlow 4s ease-in-out infinite", pointerEvents: "none", display: "none" }} />
            <div style={{ position: "absolute", bottom: "12%", left: "4%", width: 80, height: 80, background: "#9b8ec4", borderRadius: "50%", opacity: 0.08, animation: "floatSlow 5s ease-in-out infinite 0.5s", pointerEvents: "none", display: "none" }} />
            <div style={{ position: "absolute", top: "15%", left: "8%", fontSize: 180, opacity: 0.04, pointerEvents: "none", display: "none" }}>😾</div>
            <div style={{ position: "absolute", bottom: "8%", right: "10%", fontSize: 140, opacity: 0.05, pointerEvents: "none", display: "none" }}>🐾</div>
            
            <div className="hero-grid" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(20px, 8vw, 72px)", alignItems: "center", position: "relative", zIndex: 1 }}>
              <div>
                <div className="tag" style={{ color: BRAND.purple, marginBottom: "clamp(12px, 3vw, 20px)", display: "flex", alignItems: "center", gap: 10, fontSize: "clamp(10px, 2vw, 11px)" }}>
                  <span style={{ display: "inline-block", width: 28, height: 3, background: `linear-gradient(90deg, ${BRAND.yellow}, transparent)`, borderRadius: 2 }} />
                  Durban's First Cat Café
                </div>
                <h1 style={{ fontWeight: 900, fontSize: "clamp(28px, 7vw, 80px)", lineHeight: 1.05, color: BRAND.text, marginBottom: "clamp(16px, 4vw, 24px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Great coffee.<br />
                  <span style={{ color: BRAND.purple }}>Grumpy cats.</span><br />
                  No apologies.
                </h1>
                <p style={{ fontSize: "clamp(14px, 2vw, 16px)", color: BRAND.textLight, lineHeight: 1.8, maxWidth: 420, marginBottom: "clamp(24px, 5vw, 40px)" }}>
                  If you love caffeine with a side of cat cuddles, then this is for you. MeanKat Café is Durban's newest whisker-filled hangout where rescue cats rule the lounge while you enjoy your coffee and a bite.
                </p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <button className="mk-primary" onClick={() => navigate("Menu")}>View Menu</button>
                  <button className="mk-outline" onClick={() => navigate("Cats")}>Meet the Cats</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                {/* Entrance fee */}
                <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, borderRadius: 20, padding: "clamp(20px, 4vw, 32px)", boxShadow: "0 12px 40px rgba(240,216,74,0.25)", position: "relative", overflow: "visible" }}>
                  {/* Cat lying on top of the card — transparent PNG, no white box */}
                  <div aria-hidden="true" style={{ position: "absolute", top: -48, left: 16, pointerEvents: "none", zIndex: 10, animation: "floatSlow 4s ease-in-out infinite" }}>
                    <img
                      src="/cat-lie-down.png"
                      alt=""
                      style={{
                        width: "clamp(140px, 18vw, 190px)",
                        height: "auto",
                        display: "block",
                        filter: "brightness(0) saturate(100%) invert(62%) sepia(20%) saturate(600%) hue-rotate(215deg) brightness(0.88) drop-shadow(0 6px 12px rgba(58,48,96,0.2))",
                      }}
                    />
                  </div>
                  <div className="tag" style={{ color: BRAND.text, marginBottom: 10, fontSize: "clamp(10px, 2vw, 11px)" }}>Entrance Fee</div>
                  <div style={{ fontWeight: 900, fontSize: "clamp(18px, 4vw, 26px)", color: BRAND.text, marginBottom: 18 }}>Visit the Cats 🐱</div>
                  {[["R50", "Per person"], ["R40", "Students · weekdays (card req.)"], ["R40", "Pensioners"], ["Free", "Children under 1 year"]].map(([p, l]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(58,48,96,0.15)", fontSize: "clamp(12px, 2vw, 13px)" }}>
                      <span style={{ fontWeight: 800, color: BRAND.text }}>{p}</span>
                      <span style={{ fontSize: "clamp(10px, 1.5vw, 13px)", color: BRAND.textLight }}>{l}</span>
                    </div>
                  ))}
                </div>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[{ icon: "😾", num: String(catEntries.length), label: "Resident Cats" }, { icon: "☕", num: "30+", label: "Drinks on Menu" }, { icon: "🍰", num: "8+", label: "Fresh Desserts" }, { icon: "📍", num: "DBN", label: "Durban, KZN" }].map(s => (
                    <div key={s.label} style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 14, padding: "clamp(14px, 2vw, 18px)", textAlign: "center", transition: "all 0.3s", cursor: "pointer", boxShadow: "0 4px 12px rgba(155,142,196,0.08)" }}>
                      <div style={{ fontSize: "clamp(18px, 4vw, 22px)", marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: "clamp(16px, 3vw, 22px)", background: `linear-gradient(135deg, ${BRAND.purple}, #7a6fa8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.num}</div>
                      <div className="tag" style={{ fontSize: "clamp(8px, 1.5vw, 9px)", color: BRAND.textLight }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div style={{ background: `linear-gradient(135deg, ${BRAND.purple}, #7a6fa8)`, padding: "clamp(40px, 10vw, 64px) clamp(20px, 5vw, 40px)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-10%", right: "0", width: 300, height: 300, background: "rgba(255,255,255,0.04)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "clamp(24px, 5vw, 40px)", textAlign: "center", position: "relative", zIndex: 1 }}>
              {[
                { icon: "☕", title: "Specialty Coffee", body: "From espresso to matcha. The one thing here genuinely delighted to see you." },
                { icon: "😼", title: "Real Cat Encounters", body: "6 rescue cats roam freely. They may sit on you. That is a privilege." },
                { icon: "🍰", title: "Cakes & Bakes", body: "Fresh desserts, crumble biscuits, and tiramisu buns made daily." },
                { icon: "🏡", title: "Adoption Agency", body: "Fall in love over a latte. Our cats are available to adopt." },
              ].map(f => (
                <div key={f.title} style={{ transition: "transform 0.3s" }}>
                  <div style={{ fontSize: "clamp(26px, 5vw, 34px)", marginBottom: 12, animation: "floatSlow 3s ease-in-out infinite" }}>{f.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: "clamp(15px, 3vw, 17px)", color: "white", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: "clamp(12px, 2vw, 13px)", color: "rgba(255,255,255,0.85)", lineHeight: 1.8 }}>{f.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 40px)", textAlign: "center", background: BRAND.cream }}>
            <div style={{ fontWeight: 900, fontSize: "clamp(22px, 5vw, 40px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 14 }}>Ready to be ignored by a cat?</div>
            <p style={{ color: BRAND.textLight, fontSize: "clamp(13px, 2vw, 15px)", marginBottom: 32, lineHeight: 1.8 }}>Find us on Instagram @meankatcafe_durban · TikTok @meankatcafe_durban · Facebook: Meankat Cafe</p>
            <button className="mk-primary" onClick={() => navigate("Contact")}>Get in Touch</button>
          </div>
        </div>
      )}

      {/* ══════════ MENU ══════════ */}
      {page === "Menu" && (
       <div style={{ padding: "clamp(40px, 10vw, 72px) clamp(20px, 5vw, 40px)", background: `linear-gradient(to bottom, ${BRAND.cream}, #f5f0d8)` }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ marginBottom: "clamp(32px, 8vw, 44px)" }}>
              <div className="tag" style={{ color: BRAND.yellow, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(10px, 2vw, 11px)" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, background: BRAND.yellow, borderRadius: "50%" }} />
                What we serve
              </div>
              <h1 style={{ fontWeight: 900, fontSize: "clamp(28px, 6vw, 68px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, marginBottom: 14 }}>Our Menu</h1>
              <p style={{ color: BRAND.textLight, fontSize: "clamp(13px, 2vw, 15px)", maxWidth: 480, lineHeight: 1.7 }}>
                The one part of MeanKat that's genuinely happy you're here. All prices include a small cat welfare contribution.
              </p>
            </div>
            
            {/* Menu Photo Carousel */}
            <div style={{ position: "relative", marginBottom: 48 }}>
              <div
                ref={carouselRef}
                onMouseDown={(e) => {
                  isDragging.current = true;
                  dragStartX.current = e.pageX - (carouselRef.current?.offsetLeft ?? 0);
                  dragScrollLeft.current = carouselRef.current?.scrollLeft ?? 0;
                  dragDistance.current = 0;
                  if (carouselRef.current) carouselRef.current.style.cursor = "grabbing";
                }}
                onMouseMove={(e) => {
                  if (!isDragging.current) return;
                  e.preventDefault();
                  const x = e.pageX - (carouselRef.current?.offsetLeft ?? 0);
                  const walk = x - dragStartX.current;
                  dragDistance.current = Math.abs(walk);
                  if (carouselRef.current) carouselRef.current.scrollLeft = dragScrollLeft.current - walk;
                }}
                onMouseUp={() => { isDragging.current = false; if (carouselRef.current) carouselRef.current.style.cursor = "grab"; }}
                onMouseLeave={() => { isDragging.current = false; if (carouselRef.current) carouselRef.current.style.cursor = "grab"; }}
                style={{ display: "flex", gap: "clamp(14px, 3vw, 22px)", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 12, scrollbarWidth: "thin", scrollbarColor: `${BRAND.purple} rgba(155,142,196,0.15)`, cursor: "grab", userSelect: "none" }}
              >
                {menuImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => { if (dragDistance.current < 6) setMenuModalImage(img); }}
                    style={{ flex: "0 0 clamp(260px, 42vw, 520px)", scrollSnapAlign: "start", background: "white", borderRadius: 20, border: `2px solid ${BRAND.purpleLight}`, overflow: "hidden", boxShadow: "0 8px 28px rgba(155,142,196,0.18)", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={(e) => { if (!isDragging.current) { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(155,142,196,0.3)"; } }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(155,142,196,0.18)"; }}
                  >
                    <img src={img.url} alt="MeanKat menu" style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none" }} />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: BRAND.textLight, opacity: 0.7 }}>
                ← drag to scroll · click to enlarge →
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, borderRadius: 16, padding: "clamp(20px, 4vw, 26px) clamp(20px, 4vw, 30px)", display: "flex", gap: 18, alignItems: "flex-start", boxShadow: "0 8px 24px rgba(240,216,74,0.2)", flexWrap: "wrap" }}>
              <span style={{ fontSize: "clamp(20px, 4vw, 26px)" }}>🐾</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "clamp(13px, 2.5vw, 15px)", color: BRAND.text, marginBottom: 6 }}>Don't forget the entrance fee!</div>
                <div style={{ fontSize: "clamp(12px, 2vw, 13px)", color: BRAND.textLight, lineHeight: 1.7 }}>
                  R50 per person · R40 students on weekdays (student card required) · R40 pensioners · Free for children under 1 year
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CATS ══════════ */}
      {page === "Cats" && (
        <div style={{ padding: "clamp(40px, 10vw, 72px) clamp(20px, 5vw, 40px)", background: `linear-gradient(to bottom, #f5f0d8, ${BRAND.cream})` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: "clamp(32px, 8vw, 52px)" }}>
              <div className="tag" style={{ color: BRAND.yellow, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(10px, 2vw, 11px)" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, background: BRAND.yellow, borderRadius: "50%" }} />
                The cats
              </div>
              <h1 style={{ fontWeight: 900, fontSize: "clamp(28px, 6vw, 68px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, marginBottom: 14 }}>
                Meet the <span style={{ color: BRAND.purple }}>Residents.</span>
              </h1>
              <p style={{ color: BRAND.textLight, fontSize: "clamp(13px, 2vw, 15px)", maxWidth: 460, lineHeight: 1.7 }}>
                They run this place. We just make the coffee. Use the filters below to browse resident cats, adoptable cats, and dual adoptions.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {["All", ...CAT_CATEGORY_OPTIONS.map((option) => option.value)].map((value) => (
                <button
                  key={value}
                  className={`mk-filter ${catFilter === value ? "on" : ""}`}
                  onClick={() => setCatFilter(value as "All" | "resident" | "adoptable" | "dual")}
                >
                  {value === "All" ? "All Cats" : CAT_CATEGORY_OPTIONS.find((option) => option.value === value)?.label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "clamp(16px, 3vw, 22px)", marginBottom: 44 }}>
              {visibleCats.map(cat => {
                const currentImageIndex = selectedCatImage[cat.name] || 0;
                const displayImage = cat.images ? cat.images[currentImageIndex] : null;
                return (
                <div key={cat.name} className="mk-card" style={{ cursor: "pointer" }} onClick={() => { setModalCat(cat); setModalImageIndex(currentImageIndex); }}>
                  {displayImage ? (
                    <div style={{ width: "100%", height: 200, marginBottom: 16, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(155,142,196,0.12)" }}>
                      <img src={displayImage} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 72, height: 72, background: `linear-gradient(135deg, ${BRAND.purple}33, ${BRAND.yellow}22)`, border: `2px solid ${BRAND.purpleLight}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16, boxShadow: "0 4px 12px rgba(155,142,196,0.12)" }}>
                      {cat.emoji}
                    </div>
                  )}
                  <div style={{ fontWeight: 900, fontSize: 22, background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 3 }}>{cat.name}</div>
                  <div className="tag" style={{ fontSize: 10, color: BRAND.textLight, marginBottom: 8 }}>
                    {cat.breed || categoryLabel(cat.category)}
                  </div>
                  <div style={{ display: "inline-flex", marginBottom: 10, padding: "6px 12px", borderRadius: 999, background: cat.category === "resident" ? "rgba(155,142,196,0.12)" : cat.category === "dual" ? "rgba(155,142,196,0.22)" : "rgba(240,216,74,0.2)", color: BRAND.text, fontSize: 11, fontWeight: 700 }}>
                    {cat.category === "resident" ? "Resident cat" : cat.category === "dual" ? "Dual adoption" : "Adoptable cat"}
                  </div>
                  <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, display: "inline-block", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, color: BRAND.text, marginBottom: 14, boxShadow: "0 2px 8px rgba(240,216,74,0.2)" }}>
                    Currently: {cat.mood || "Unknown mood"}
                  </div>
                  <div className="cat-desc-scroll" style={{ marginTop: 2, marginBottom: 2 }}>
                    <p style={{ fontSize: 13, color: BRAND.textLight, lineHeight: 1.8 }}>{emojify(cat.description)}</p>
                  </div>
                  {cat.images && cat.images.length > 1 && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {cat.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`${cat.name} ${i + 1}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedCatImage({ ...selectedCatImage, [cat.name]: i }); }}
                          style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover", border: currentImageIndex === i ? `2px solid ${BRAND.yellow}` : `1px solid ${BRAND.purpleLight}`, cursor: "pointer", transition: "all 0.3s", boxShadow: currentImageIndex === i ? `0 0 8px ${BRAND.yellow}` : "none" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
            <div style={{ background: `linear-gradient(135deg, ${BRAND.purple}, #7a6fa8)`, borderRadius: 20, padding: "36px 40px", color: "white", textAlign: "center", boxShadow: "0 12px 40px rgba(155,142,196,0.2)" }}>
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>🐾 Resident cats and visitors welcome</div>
              <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.8, maxWidth: 580, margin: "0 auto" }}>
                Resident cats are the house favourites. Adoptable cats and dual adoptions can be uploaded by approved admins and still appear on the public site. Please don't disturb sleeping cats, and never force an interaction — they'll come to you if they feel like it. They almost certainly won't.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ STORY ══════════ */}
      {page === "Story" && (
        <div style={{ padding: "clamp(40px, 10vw, 72px) clamp(20px, 5vw, 40px)", background: `linear-gradient(to bottom, ${BRAND.cream}, #f5f0d8)` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: "clamp(32px, 8vw, 52px)" }}>
              <div className="tag" style={{ color: BRAND.yellow, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(10px, 2vw, 11px)" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, background: BRAND.yellow, borderRadius: "50%" }} />
                Our origin
              </div>
              <h1 style={{ fontWeight: 900, fontSize: "clamp(28px, 6vw, 68px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.05, marginBottom: 14 }}>
                How MeanKat Café Began
              </h1>
              <p style={{ color: BRAND.textLight, fontSize: "clamp(13px, 2vw, 15px)", maxWidth: 600, lineHeight: 1.8 }}>
                Founded by Maahira Essack, a lifelong animal lover with deep passion for cat welfare and rescue.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "clamp(20px, 5vw, 32px)", marginBottom: 52 }}>
              <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 40px rgba(155,142,196,0.2)" }}>
                <img src="/founder-maahira.jpg" alt="Maahira Essack, founder of MeanKat Café, with her cats" style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }} />
              </div>

              <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: "clamp(24px, 4vw, 36px)", boxShadow: "0 8px 24px rgba(155,142,196,0.12)" }}>
                <div style={{ fontWeight: 800, fontSize: "clamp(15px, 3vw, 18px)", color: BRAND.purple, marginBottom: 16 }}>The Vision</div>
                <p style={{ fontSize: "clamp(13px, 2vw, 14px)", color: BRAND.textLight, lineHeight: 1.9, marginBottom: 14 }}>
                  After years of learning cat behaviour and understanding what makes them feel safe, Maahira knew she wanted to do something bigger and more sustainable than just fostering a few cats at a time.
                </p>
                <p style={{ fontSize: "clamp(13px, 2vw, 14px)", color: BRAND.textLight, lineHeight: 1.9 }}>
                  She recognized a key challenge in rescue work: when cats aren't adopted, fosters can't take in new rescues. The cycle of waiting never ends. That's when MeanKat Café was born — a feline sanctuary designed to help more rescue cats find loving homes.
                </p>
              </div>

              <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: "clamp(24px, 4vw, 36px)", boxShadow: "0 8px 24px rgba(155,142,196,0.12)" }}>
                <div style={{ fontWeight: 800, fontSize: "clamp(15px, 3vw, 18px)", color: BRAND.purple, marginBottom: 16 }}>The Mission</div>
                <p style={{ fontSize: "clamp(13px, 2vw, 14px)", color: BRAND.textLight, lineHeight: 1.9, marginBottom: 14 }}>
                  All the cats at MeanKat are rescues, many arriving from distressing or neglected environments. They need a calm, loving space to reset — just like you do.
                </p>
                <p style={{ fontSize: "clamp(13px, 2vw, 14px)", color: BRAND.textLight, lineHeight: 1.9 }}>
                  Inspired by the incredible work of Suzanne Kunz from PMB Kitten Fostering & Rescue, we work closely with local fosters on urgent rehoming cases. Guest entry fees go directly to food, vet care, and the cats' overall well-being. Together, we're increasing adoption opportunities and saving more lives.
                </p>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, borderRadius: 20, padding: "clamp(24px, 4vw, 36px)", boxShadow: "0 12px 40px rgba(240,216,74,0.2)" }}>
                <div style={{ fontWeight: 800, fontSize: "clamp(15px, 3vw, 18px)", color: BRAND.text, marginBottom: 16 }}>What We Offer</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[
                    { icon: "☕", title: "Halal Coffee & Café", desc: "Specialty coffees, frappes, desserts & light meals" },
                    { icon: "🎨", title: "Weekly Events", desc: "Yoga, cat & canvas, beauty treatments & more" },
                    { icon: "🐾", title: "Cat Lounge", desc: "Supervised time with rescue cats in a safe space" },
                    { icon: "💜", title: "Adoption Support", desc: "Help rescue cats find forever homes" },
                  ].map(item => (
                    <div key={item.title}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.text, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: BRAND.textLight, lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: BRAND.purple, borderRadius: 20, padding: "clamp(32px, 5vw, 44px)", color: "white", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: "clamp(18px, 4vw, 24px)", marginBottom: 12 }}>Located in Durban's Morningside</div>
                <p style={{ fontSize: "clamp(12px, 2vw, 14px)", opacity: 0.9, lineHeight: 1.8, marginBottom: 24 }}>
                  MeanKat Café is Durban's first dedicated cat café and adoption sanctuary. A place where rescue cats thrive, people find peace, and something beautiful happens over a cup of coffee.
                </p>
                <button className="mk-primary" onClick={() => navigate("Contact")}>Visit Us Today</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ABOUT ══════════ */}
      {page === "About" && (
        <div style={{ padding: "72px 40px", background: `linear-gradient(to bottom, ${BRAND.cream}, #f5f0d8)` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start", marginBottom: 64 }}>
              <div>
                <div className="tag" style={{ color: BRAND.yellow, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, background: BRAND.yellow, borderRadius: "50%" }} />
                  Our story
                </div>
                <h1 style={{ fontWeight: 900, fontSize: "clamp(36px, 5vw, 56px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.05, marginBottom: 26 }}>
                  Durban's most loveable grumps.
                </h1>
                {["MeanKat Café started with a simple idea: rescue cats deserve loving homes, and people deserve excellent coffee. We combined both and opened Durban's first cat café.",
                  "Our rescue cats are the heart of everything we do. They're grumpy, unpredictable, and completely in charge — and visitors absolutely love them for it.",
                  "We also run MeanKat Café Adoption Agency, helping our cats find their forever homes. Every visit you make supports our rescue mission.",
                  "Our menu is fully halal and fully delicious — specialty coffees, frappes, desserts and light café-style meals, all enjoyed while a whiskered companion supervises your snack choices.",
                  "We host weekly events including yoga, cat & canvas, makeup classes, beauty treatments and more stress-reducing activities surrounded by kitty love.",
                  "Find us on Instagram, TikTok and Facebook: @meankatcafe_durban"
                ].map((p, i) => (
                  <p key={i} style={{ fontSize: 14, color: BRAND.textLight, lineHeight: 1.9, marginBottom: 18 }}>{p}</p>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🐾", title: "Rescue First", body: "Every cat here came from a rescue situation. We give cats a safe, enriching environment while they find forever homes." },
                  { icon: "☕", title: "Specialty Coffee", body: "Ethically sourced and expertly prepared. From classic espresso to matcha fusions — every cup made with care." },
                  { icon: "🏡", title: "Adoption Agency", body: "MeanKat runs an adoption agency alongside the café. Fall in love over a latte and take one home." },
                  { icon: "💜", title: "Community Space", body: "A gathering place for cat lovers, coffee people, and anyone who needs a quiet corner with a purring companion." },
                ].map(v => (
                  <div key={v.title} style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 14, padding: "20px 22px", display: "flex", gap: 14, transition: "all 0.3s", cursor: "pointer", boxShadow: "0 4px 12px rgba(155,142,196,0.08)" }}>
                    <span style={{ fontSize: 24, minWidth: 28, marginTop: 2, animation: "floatSlow 3s ease-in-out infinite" }}>{v.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: BRAND.text, marginBottom: 5 }}>{v.title}</div>
                      <div style={{ fontSize: 13, color: BRAND.textLight, lineHeight: 1.7 }}>{v.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${BRAND.purple}, #7a6fa8)`, borderRadius: 20, padding: "48px", textAlign: "center", color: "white", boxShadow: "0 12px 40px rgba(155,142,196,0.25)" }}>
              <div style={{ fontSize: 48, marginBottom: 14, animation: "floatSlow 3s ease-in-out infinite" }}>😺</div>
              <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 12 }}>MeanKat Adoption Agency</div>
              <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.8, maxWidth: 500, margin: "0 auto 28px" }}>
                Can't leave without your new best frenemy? Our cats are available for adoption. Come meet them — they'll pretend not to care. It's part of their charm.
              </div>
              <button className="mk-primary" style={{ background: BRAND.yellow, color: BRAND.text }} onClick={() => navigate("Contact")}>Enquire About Adoption</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CONTACT ══════════ */}
      {page === "Contact" && (
        <div style={{ padding: "clamp(40px, 10vw, 72px) clamp(20px, 5vw, 40px)", background: `linear-gradient(to bottom, #f5f0d8, ${BRAND.cream})` }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ marginBottom: "clamp(32px, 8vw, 52px)" }}>
              <div className="tag" style={{ color: BRAND.yellow, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(10px, 2vw, 11px)" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, background: BRAND.yellow, borderRadius: "50%" }} />
                Say hello
              </div>
              <h1 style={{ fontWeight: 900, fontSize: "clamp(28px, 6vw, 68px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.05, marginBottom: 14 }}>
                We reply.<br /><span style={{ color: BRAND.purple }}>The cats don't.</span>
              </h1>
            </div>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px, 8vw, 60px)", alignItems: "start" }}>
              <div>
                {submitted ? (
                  <div style={{ background: `linear-gradient(135deg, ${BRAND.purple}, #7a6fa8)`, borderRadius: 20, padding: "48px", textAlign: "center", color: "white", boxShadow: "0 12px 40px rgba(155,142,196,0.25)" }}>
                    <div style={{ fontSize: 48, marginBottom: 14, animation: "floatSlow 3s ease-in-out infinite" }}>😾</div>
                    <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>Message received.</div>
                    <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.8 }}>We'll get back to you soon. The cats have been informed. They remain indifferent.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { label: "Your Name", key: "name", type: "input", placeholder: "e.g. Sarah" },
                      { label: "Email Address", key: "email", type: "input", placeholder: "sarah@email.com" },
                      { label: "Message", key: "msg", type: "textarea", placeholder: "Reservations, events, adoption enquiries, or just to say hi..." },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="tag" style={{ fontSize: 10, color: BRAND.textLight, display: "block", marginBottom: 8 }}>{f.label}</label>
                        {f.type === "textarea"
                          ? <textarea className="mk-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                          : <input className="mk-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />}
                      </div>
                    ))}
                    <button className="mk-primary" style={{ alignSelf: "flex-start" }}
                      onClick={() => { if (form.name && form.email && form.msg) setSubmitted(true); }}>
                      Send Message
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "📍", label: "Location", value: "Durban, KwaZulu-Natal\nSouth Africa" },
                  { icon: "🕐", label: "Hours", value: "Mon – Fri: 08:00 – 17:00\nSat – Sun: 09:00 – 16:00" },
                  { icon: "📱", label: "Social Media", value: "@meankatcafe_durban\nInstagram · TikTok · Facebook" },
                  { icon: "🐾", label: "Adoption Enquiries", value: "Ask us about adopting any of our resident cats. Mention adoption in your message!" },
                ].map(info => (
                  <div key={info.label} style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 14, padding: "20px 22px", display: "flex", gap: 14, transition: "all 0.3s", cursor: "pointer", boxShadow: "0 4px 12px rgba(155,142,196,0.08)" }}>
                    <span style={{ fontSize: 22, minWidth: 26, animation: "floatSlow 3s ease-in-out infinite" }}>{info.icon}</span>
                    <div>
                      <div className="tag" style={{ fontSize: 10, color: BRAND.purple, marginBottom: 6 }}>{info.label}</div>
                      <div style={{ fontSize: 13, color: BRAND.textLight, lineHeight: 1.8, whiteSpace: "pre-line" }}>{info.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: BRAND.purpleDark, color: BRAND.white, padding: "clamp(40px, 10vw, 72px) clamp(20px, 5vw, 40px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "clamp(32px, 8vw, 52px)", marginBottom: "clamp(32px, 8vw, 52px)", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <img src="/logo.png" alt="MeanKat Cafe" style={{ height: "clamp(50px, 10vw, 70px)", width: "auto" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "clamp(13px, 2.5vw, 15px)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 2 }}>Location</div>
              <div style={{ fontSize: "clamp(12px, 2vw, 13px)", opacity: 0.9, lineHeight: 1.8 }}>
                Morningside<br />Durban, KZN<br />South Africa
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "clamp(13px, 2.5vw, 15px)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 2 }}>Follow Us</div>
              <div style={{ fontSize: "clamp(12px, 2vw, 13px)", opacity: 0.9, lineHeight: 1.8 }}>
                Instagram<br />TikTok<br />Facebook
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "clamp(13px, 2.5vw, 15px)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 2 }}>Hours</div>
              <div style={{ fontSize: "clamp(12px, 2vw, 13px)", opacity: 0.9, lineHeight: 1.8 }}>
                Mon – Fri: 8am–6pm<br />Sat: 9am–6pm<br />Sun: 9am–5pm
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "clamp(24px, 5vw, 32px)", textAlign: "center", fontSize: "clamp(11px, 1.8vw, 12px)", opacity: 0.8 }}>
            © 2025 MeanKat Café. All rights reserved. · Durban's only cat café where humans serve, cats rule.
          </div>
        </div>
      </footer>

      {/* ── MENU IMAGE MODAL ── */}
      {menuModalImage && (
        <div
          onClick={() => setMenuModalImage(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,16,48,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "min(92vw, 860px)", width: "100%", animation: "fadeIn 0.2s ease" }}
          >
            <button
              onClick={() => setMenuModalImage(null)}
              style={{ position: "absolute", top: -16, right: -16, zIndex: 10, background: "white", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20, color: BRAND.purpleDark, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
              aria-label="Close"
            >×</button>
            <img
              src={menuModalImage.url}
              alt="MeanKat menu"
              style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 20, display: "block", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
            />
          </div>
        </div>
      )}

      {/* ── CAT MODAL ── */}
      {modalCat && (
        <div
          onClick={() => setModalCat(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(30,24,60,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fffef5", borderRadius: 24, padding: "clamp(24px, 4vw, 40px)", maxWidth: 540, width: "100%", boxShadow: "0 32px 80px rgba(58,48,96,0.35)", animation: "fadeIn 0.25s ease", position: "relative", maxHeight: "90vh", overflowY: "hidden", display: "flex", flexDirection: "column" }}
          >
            <button
              onClick={() => setModalCat(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(155,142,196,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#7a6fa8", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              aria-label="Close"
            >×</button>

            {modalCat.images?.[modalImageIndex] ? (
              <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 20, boxShadow: "0 8px 24px rgba(155,142,196,0.18)" }}>
                <img src={modalCat.images[modalImageIndex]} alt={modalCat.name} style={{ width: "100%", maxHeight: 380, objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <div style={{ fontSize: 80, textAlign: "center", marginBottom: 20 }}>{modalCat.emoji}</div>
            )}

            {modalCat.images && modalCat.images.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {modalCat.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${modalCat.name} ${i + 1}`}
                    onClick={() => setModalImageIndex(i)}
                    style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", cursor: "pointer", border: modalImageIndex === i ? `2px solid ${BRAND.yellow}` : `1.5px solid ${BRAND.purpleLight}`, boxShadow: modalImageIndex === i ? `0 0 0 3px rgba(240,216,74,0.35)` : "none", transition: "all 0.2s" }}
                  />
                ))}
              </div>
            )}

            <div style={{ fontWeight: 900, fontSize: "clamp(22px, 4vw, 28px)", background: `linear-gradient(135deg, ${BRAND.text}, ${BRAND.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>{modalCat.name}</div>
            <div className="tag" style={{ fontSize: 10, color: BRAND.textLight, marginBottom: 10 }}>{modalCat.breed || categoryLabel(modalCat.category)}</div>
            <div style={{ display: "inline-flex", marginBottom: 12, padding: "6px 14px", borderRadius: 999, background: modalCat.category === "resident" ? "rgba(155,142,196,0.12)" : modalCat.category === "dual" ? "rgba(155,142,196,0.22)" : "rgba(240,216,74,0.2)", fontSize: 12, fontWeight: 700, color: BRAND.text }}>
              {modalCat.category === "resident" ? "Resident cat" : modalCat.category === "dual" ? "Dual adoption" : "Adoptable cat"}
            </div>
            {modalCat.mood && (
              <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, display: "inline-block", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, color: BRAND.text, marginLeft: 8, marginBottom: 16, boxShadow: "0 2px 8px rgba(240,216,74,0.2)" }}>
                Currently: {modalCat.mood}
              </div>
            )}
            <div style={{ overflowY: "auto", marginTop: 8, paddingRight: 4, flexShrink: 1, scrollbarWidth: "thin", scrollbarColor: "#9b8ec4 rgba(155,142,196,0.15)" }}>
              <p style={{ fontSize: 14, color: BRAND.textLight, lineHeight: 1.9 }}>{emojify(modalCat.description)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
