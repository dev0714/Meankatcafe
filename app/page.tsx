"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CAT_CATEGORY_OPTIONS, DEFAULT_CATS, categoryLabel, mergeCatsByName, type CatCard } from "@/lib/cats";

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

const menuSections = [
  { title: "Coffee", emoji: "☕", items: [
    { name: "Espresso", price: "R28" }, { name: "Extra Shot", price: "+R7" },
    { name: "Americano", price: "R32" }, { name: "Cappuccino", price: "R36" },
    { name: "Flat White", price: "R40" }, { name: "Cortado", price: "Single R35 / Double R37" },
  ]},
  { title: "Lattes", emoji: "🥛", items: [
    { name: "Classic", price: "R38" }, { name: "Spicy Chai", price: "R41" },
    { name: "Dirty Chai", price: "R45" }, { name: "Vanilla", price: "R68" },
    { name: "Rolo, Speckled Egg, Milk Tart, Double Choc or Blueberry Choc", price: "R75" },
  ]},
  { title: "Mochas", emoji: "🍫", items: [
    { name: "Classic", price: "R50" }, { name: "Cocoa", price: "R60" }, { name: "White Mocha", price: "R60" },
  ]},
  { title: "Hot Chocolate", emoji: "🍵", items: [
    { name: "Classic", price: "R45" }, { name: "Double Chocolate", price: "R60" },
    { name: "White Chocolate", price: "R58" },
    { name: "Delux Add-Ons: Rolo, Milk Tart, Speckled Egg or Bubblegum", price: "R60" },
  ]},
  { title: "Matcha — Hot", emoji: "🍵", items: [
    { name: "Coconut Matcha Latte", price: "R65" },
    { name: "Strawberry & Coconut Matcha Latte", price: "R70" },
    { name: "Choc-Coconut Matcha Fusion", price: "R72" },
  ]},
  { title: "Matcha — Cold", emoji: "🧊", items: [
    { name: "Coconut Matcha Latte", price: "R68" },
    { name: "Strawberry & Coconut Matcha Latte", price: "R70" },
    { name: "Choc-Coconut Matcha Fusion", price: "R75" },
    { name: "Coconut Matcha Crusher", price: "R75" },
  ]},
  { title: "Crushers", emoji: "🧃", items: [
    { name: "Strawberry", price: "R70" }, { name: "Peach", price: "R70" },
    { name: "Raspberry Dragonfruit", price: "R70" }, { name: "Mixed Berry", price: "R70" },
    { name: "Mango", price: "R70" }, { name: "Passion Fruit", price: "R65" },
    { name: "Pear Elderflower", price: "R70" },
  ]},
  { title: "Frappes", emoji: "🥤", items: [
    { name: "Coffee", price: "R55" }, { name: "White Chocolate", price: "R60" },
    { name: "Bubble Gum", price: "R70" }, { name: "Milk Tart", price: "R70" },
    { name: "Iced Cappuccino", price: "R67" },
  ]},
  { title: "Milkshakes", emoji: "🥛", items: [
    { name: "Vanilla, Strawberry, Chocolate or Bubblegum", price: "R55" },
    { name: "Double Chocolate", price: "R65" }, { name: "Mango", price: "R70" },
    { name: "Rolo, Milk Tart, Speckled Egg, Unicorn or Mixed Berry", price: "R75" },
  ]},
  { title: "Mini Pitas", emoji: "🥙", items: [
    { name: "Tender chicken with Middle Eastern spices, tomatoes, onions & tahini\nFlavours: Middle Eastern · Spicy · Mediterranean with Pineapple · Lemon & Herb", price: "R65" },
  ]},
  { title: "Crumble Biscuits", emoji: "🍪", items: [
    { name: "Chocolate", price: "R45" }, { name: "Triple Choc", price: "R50" },
    { name: "Oreo Delight", price: "R50" }, { name: "Smores", price: "R50" },
    { name: "Lotus Biscoff Delight", price: "R55" }, { name: "Pistachio", price: "R55" },
    { name: "Nutella Choc Chip", price: "R55" },
    { name: "Mini Choc Chip Cookies", price: "Regular R45 / Large R65" },
  ]},
  { title: "Desserts", emoji: "🍰", items: [
    { name: "Chocolate Cake", price: "R55" }, { name: "Chocolate Cheesecake", price: "R80" },
    { name: "Brownie", price: "R60" }, { name: "Kataifi Brownie", price: "R85" },
    { name: "Brown Butter Almond Cake", price: "R65" }, { name: "Tiramisu Buns", price: "R85" },
    { name: "Cinnamon Buns", price: "R60" }, { name: "Waffle Sticks (ask for topping options)", price: "R80" },
  ]},
];

const menuGroupMap = {
  "Coffee & Hot": ["Coffee", "Lattes", "Mochas", "Hot Chocolate", "Matcha — Hot"],
  "Cold Drinks": ["Matcha — Cold", "Crushers", "Frappes", "Milkshakes"],
  "Food & Sweets": ["Mini Pitas", "Crumble Biscuits", "Desserts"],
};

export default function MeanKatCafe() {
  const [page, setPage] = useState("Home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState("All");
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [submitted, setSubmitted] = useState(false);
  const [selectedCatImage, setSelectedCatImage] = useState<Record<string, number>>({});
  const [catEntries, setCatEntries] = useState<CatCard[]>(DEFAULT_CATS);
  const [catFilter, setCatFilter] = useState<"All" | "resident" | "other">("All");

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => {
    const loadCats = async () => {
      const response = await fetch("/api/cats");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as CatCard[];
      setCatEntries((current) => mergeCatsByName(current, data));
    };

    loadCats();
  }, []);

  const navigate = (p) => { setPage(p); setMobileOpen(false); };

  const visibleSections = menuFilter === "All"
    ? menuSections
    : menuSections.filter(s => menuGroupMap[menuFilter]?.includes(s.title));
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
                  {[{ icon: "😾", num: "6", label: "Resident Cats" }, { icon: "☕", num: "30+", label: "Drinks on Menu" }, { icon: "🍰", num: "8+", label: "Fresh Desserts" }, { icon: "📍", num: "DBN", label: "Durban, KZN" }].map(s => (
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
            
            {/* Full Menu Images */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(16px, 4vw, 28px)", marginBottom: 48 }}>
              <div style={{ background: "white", borderRadius: 20, border: `2px solid ${BRAND.purpleLight}`, overflow: "hidden", boxShadow: "0 12px 40px rgba(155,142,196,0.2)", transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }} onMouseOver={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(155,142,196,0.35)"; }} onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(155,142,196,0.2)"; }}>
                <img src="/menu1.jpg" alt="MeanKat Cafe Menu - Matcha, Pitas, Biscuits, Desserts" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <div style={{ background: "white", borderRadius: 20, border: `2px solid ${BRAND.purpleLight}`, overflow: "hidden", boxShadow: "0 12px 40px rgba(155,142,196,0.2)", transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }} onMouseOver={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(155,142,196,0.35)"; }} onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(155,142,196,0.2)"; }}>
                <img src="/menu2.jpg" alt="MeanKat Cafe Menu - Coffee, Lattes, Mochas, Drinks, Frappes" style={{ width: "100%", height: "auto", display: "block" }} />
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
                They run this place. We just make the coffee. Use the filters below to switch between resident cats and other cats.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {["All", ...CAT_CATEGORY_OPTIONS.map((option) => option.value)].map((value) => (
                <button
                  key={value}
                  className={`mk-filter ${catFilter === value ? "on" : ""}`}
                  onClick={() => setCatFilter(value as "All" | "resident" | "other")}
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
                <div key={cat.name} className="mk-card">
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
                  <div style={{ display: "inline-flex", marginBottom: 10, padding: "6px 12px", borderRadius: 999, background: cat.category === "resident" ? "rgba(155,142,196,0.12)" : "rgba(240,216,74,0.2)", color: BRAND.text, fontSize: 11, fontWeight: 700 }}>
                    {cat.category === "resident" ? "Resident cat" : "Other cat"}
                  </div>
                  <div style={{ background: `linear-gradient(135deg, ${BRAND.yellow}, #fce4a3)`, display: "inline-block", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, color: BRAND.text, marginBottom: 14, boxShadow: "0 2px 8px rgba(240,216,74,0.2)" }}>
                    Currently: {cat.mood || "Unknown mood"}
                  </div>
                  <div className="cat-desc-scroll" style={{ marginTop: 2, marginBottom: 2 }}>
                    <p style={{ fontSize: 13, color: BRAND.textLight, lineHeight: 1.8 }}>{cat.description}</p>
                  </div>
                  {cat.images && cat.images.length > 1 && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {cat.images.map((img, i) => (
                        <img 
                          key={i} 
                          src={img} 
                          alt={`${cat.name} ${i + 1}`} 
                          onClick={() => setSelectedCatImage({ ...selectedCatImage, [cat.name]: i })}
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
                Resident cats are the house favourites. Other cats can be uploaded by approved admins and still appear on the public site. Please don't disturb sleeping cats, and never force an interaction — they'll come to you if they feel like it. They almost certainly won't.
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
    </div>
  );
}
