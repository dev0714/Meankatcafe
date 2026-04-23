"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CAT_CATEGORY_OPTIONS, DEFAULT_CATS, isUploadedCat, mergeCatsByName, type CatCard, type CatCategory, categoryLabel } from "@/lib/cats";
import { DEFAULT_MENU, MENU_FILTER_GROUPS, type MenuSection, type MenuItem } from "@/lib/menu";

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

const SIDEBAR_BG = "#2d2550";
const SIDEBAR_ACTIVE = "#9b8ec4";

type SessionUser = { id: string; email: string; isAdmin: boolean; isApproved: boolean };
type AuthState = { loading: boolean; user: SessionUser | null; error: string };
type MenuImage = { id: string; url: string };
type AdminTab = "cats" | "menu-images" | "menu-items";

const emptyUpload: { name: string; description: string; category: CatCategory } = {
  name: "",
  description: "",
  category: "resident",
};

const HIDDEN_CAT_IDS_KEY = "meankat_hidden_cat_ids";

export default function AdminClient() {
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null, error: "" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("cats");

  // --- cats ---
  const [upload, setUpload] = useState(emptyUpload);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [cats, setCats] = useState<CatCard[]>(DEFAULT_CATS);
  const [saving, setSaving] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [catMsg, setCatMsg] = useState("");
  const [hiddenCatIds, setHiddenCatIds] = useState<string[]>([]);

  // --- menu images ---
  const [menuImages, setMenuImages] = useState<MenuImage[]>([]);
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [menuImageSaving, setMenuImageSaving] = useState(false);
  const [menuImageMsg, setMenuImageMsg] = useState("");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // --- menu items ---
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [menuMsg, setMenuMsg] = useState("");
  const [menuSaving, setMenuSaving] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", emoji: "🍽️", filterGroup: MENU_FILTER_GROUPS[0] });
  const [newItem, setNewItem] = useState<Record<string, { name: string; price: string }>>({});
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDDEN_CAT_IDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) setHiddenCatIds(parsed.filter((v) => typeof v === "string"));
      }
    } catch { setHiddenCatIds([]); }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAuth({ loading: false, user: d?.user ?? null, error: "" }))
      .catch(() => setAuth({ loading: false, user: null, error: "" }));
  }, []);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/cats")
      .then((r) => r.ok ? r.json() : [])
      .then((data: CatCard[]) => {
        const merged = mergeCatsByName(DEFAULT_CATS, data);
        setCats(merged.filter((c) => !hiddenCatIds.includes(c.id)));
      })
      .catch(() => {});
  }, [auth.user, hiddenCatIds]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/menu-images")
      .then((r) => r.ok ? r.json() : [])
      .then(setMenuImages)
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/menu")
      .then((r) => r.ok ? r.json() : [])
      .then((data: MenuSection[]) => {
        const dbSections = data.filter((s) => s.id);
        setMenuSections(dbSections.length > 0 ? dbSections : []);
      })
      .catch(() => {});
  }, [auth.user]);

  // ── helpers ───────────────────────────────────────────────────────────────

  function persistHiddenCatIds(next: string[]) {
    setHiddenCatIds(next);
    try { window.localStorage.setItem(HIDDEN_CAT_IDS_KEY, JSON.stringify(next)); } catch { }
  }

  // ── auth ──────────────────────────────────────────────────────────────────

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuth((c) => ({ ...c, error: "" }));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const text = await res.text();
    let data: { error?: string; user?: SessionUser } = {};
    try { data = text ? JSON.parse(text) : {}; } catch { }
    if (!res.ok) { setAuth((c) => ({ ...c, error: data.error ?? `Login failed (${res.status})` })); return; }
    setAuth({ loading: false, user: data.user ?? null, error: "" });
    setLoginPassword("");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ loading: false, user: null, error: "" });
  }

  // ── cats ──────────────────────────────────────────────────────────────────

  async function handleUploadCat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedImage) { setCatMsg("Pick an image first."); return; }
    setSaving(true); setCatMsg("");
    const fd = new FormData();
    fd.append("name", upload.name);
    fd.append("description", upload.description);
    fd.append("category", upload.category);
    fd.append("image", selectedImage);
    const res = await fetch("/api/admin/cats", { method: "POST", body: fd });
    const text = await res.text();
    let data: { error?: string; cat?: CatCard } = {};
    try { data = text ? JSON.parse(text) : {}; } catch { }
    setSaving(false);
    if (!res.ok) { setCatMsg(data.error ?? `Upload failed (${res.status})`); return; }
    setCats((c) => [data.cat!, ...c]);
    setUpload(emptyUpload); setSelectedImage(null);
    setCatMsg("Cat uploaded successfully.");
  }

  async function handleDeleteCat(cat: CatCard) {
    if (!confirm(`Remove ${cat.name}?`)) return;
    setDeletingCatId(cat.id); setCatMsg("");
    if (!isUploadedCat(cat)) {
      persistHiddenCatIds([...new Set([...hiddenCatIds, cat.id])]);
      setCats((c) => c.filter((x) => x.id !== cat.id));
      setCatMsg(`${cat.name} hidden from admin preview.`);
      setDeletingCatId(null); return;
    }
    const res = await fetch(`/api/admin/cats/${cat.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setCatMsg(data.error ?? "Delete failed."); setDeletingCatId(null); return; }
    const refresh = await fetch("/api/cats");
    if (refresh.ok) {
      const refreshed = await refresh.json() as CatCard[];
      setCats(mergeCatsByName(DEFAULT_CATS, refreshed).filter((c) => !hiddenCatIds.includes(c.id)));
    } else {
      setCats((c) => c.filter((x) => x.id !== cat.id));
    }
    setCatMsg(data.warning ?? "Cat removed.");
    setDeletingCatId(null);
  }

  // ── menu images ───────────────────────────────────────────────────────────

  async function handleUploadMenuImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!menuImageFile) { setMenuImageMsg("Pick an image first."); return; }
    setMenuImageSaving(true); setMenuImageMsg("");
    const fd = new FormData();
    fd.append("image", menuImageFile);
    const res = await fetch("/api/admin/menu-images", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setMenuImageSaving(false);
    if (!res.ok) { setMenuImageMsg(data.error ?? "Upload failed."); return; }
    setMenuImages((imgs) => [...imgs, data.image]);
    setMenuImageFile(null);
    setMenuImageMsg("Image uploaded.");
  }

  async function handleDeleteMenuImage(img: MenuImage) {
    if (img.id.startsWith("builtin-")) {
      setMenuImageMsg("Upload at least one image to replace the built-in ones, then they'll stop showing automatically.");
      return;
    }
    if (!confirm("Delete this menu image?")) return;
    setDeletingImageId(img.id);
    const res = await fetch(`/api/admin/menu-images/${img.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMenuImageMsg(data.error ?? "Delete failed.");
    } else {
      setMenuImages((imgs) => imgs.filter((i) => i.id !== img.id));
      setMenuImageMsg("Image deleted.");
    }
    setDeletingImageId(null);
  }

  // ── menu items ────────────────────────────────────────────────────────────

  async function handleAddSection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMenuSaving(true); setMenuMsg("");
    const res = await fetch("/api/admin/menu/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSection),
    });
    const data = await res.json().catch(() => ({}));
    setMenuSaving(false);
    if (!res.ok) { setMenuMsg(data.error ?? "Failed."); return; }
    setMenuSections((s) => [...s, data.section]);
    setNewSection({ title: "", emoji: "🍽️", filterGroup: MENU_FILTER_GROUPS[0] });
    setMenuMsg("Section added.");
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Delete this section and all its items?")) return;
    setDeletingSectionId(sectionId);
    const res = await fetch(`/api/admin/menu/sections/${sectionId}`, { method: "DELETE" });
    if (res.ok) {
      setMenuSections((s) => s.filter((sec) => sec.id !== sectionId));
    } else {
      const data = await res.json().catch(() => ({}));
      setMenuMsg(data.error ?? "Delete failed.");
    }
    setDeletingSectionId(null);
  }

  async function handleAddItem(e: FormEvent<HTMLFormElement>, sectionId: string) {
    e.preventDefault();
    const item = newItem[sectionId] ?? { name: "", price: "" };
    if (!item.name || !item.price) return;
    const res = await fetch(`/api/admin/menu/sections/${sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMenuMsg(data.error ?? "Failed."); return; }
    setMenuSections((secs) =>
      secs.map((s) => s.id === sectionId ? { ...s, items: [...s.items, data.item] } : s)
    );
    setNewItem((n) => ({ ...n, [sectionId]: { name: "", price: "" } }));
  }

  async function handleDeleteItem(sectionId: string, item: MenuItem) {
    if (!item.id) return;
    setDeletingItemId(item.id);
    const res = await fetch(`/api/admin/menu/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setMenuSections((secs) =>
        secs.map((s) => s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== item.id) } : s)
      );
    } else {
      const data = await res.json().catch(() => ({}));
      setMenuMsg(data.error ?? "Delete failed.");
    }
    setDeletingItemId(null);
  }

  const groupedCats = {
    resident: cats.filter((c) => c.category === "resident"),
    adoptable: cats.filter((c) => c.category === "adoptable"),
    dual: cats.filter((c) => c.category === "dual"),
  };

  // ── nav items ─────────────────────────────────────────────────────────────

  const NAV: { id: AdminTab; label: string; icon: string }[] = [
    { id: "cats", label: "Cats", icon: "🐾" },
    { id: "menu-images", label: "Menu Photos", icon: "📸" },
    { id: "menu-items", label: "Menu Items", icon: "📋" },
  ];

  // ── render ────────────────────────────────────────────────────────────────

  if (auth.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.cream }}>
        <div style={{ fontSize: 16, color: BRAND.textLight }}>Loading…</div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div style={{ minHeight: "100vh", background: BRAND.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: 36, maxWidth: 440, width: "100%", boxShadow: "0 8px 32px rgba(155,142,196,0.15)" }}>
          <div style={{ fontWeight: 900, fontSize: 28, marginBottom: 6, color: BRAND.text }}>MeanKat Admin</div>
          <div style={{ color: BRAND.textLight, marginBottom: 24, fontSize: 14 }}>Only approved admins can enter.</div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label>
              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Email</div>
              <input className="mk-input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@meankatcafe.co.za" required />
            </label>
            <label>
              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Password</div>
              <input className="mk-input" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" required />
            </label>
            {auth.error && <div style={{ color: "#b42318", fontSize: 14 }}>{auth.error}</div>}
            <button className="mk-primary" type="submit">Log in</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Nunito', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: SIDEBAR_BG, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        <div style={{ padding: "28px 20px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Admin</div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "white", lineHeight: 1.2 }}>MeanKat<br />Content</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px" }}>
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, background: activeTab === item.id ? SIDEBAR_ACTIVE : "transparent", color: activeTab === item.id ? "white" : "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, transition: "all 0.2s", textAlign: "left" }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10, wordBreak: "break-all" }}>{auth.user.email}</div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13 }}>
            Log out
          </button>
          <Link href="/" style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>← Back to site</Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 220, flex: 1, background: "#f4f0e8", minHeight: "100vh", padding: "clamp(24px, 4vw, 40px)" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Courier+Prime:wght@400;700&display=swap');
          * { box-sizing: border-box; }
          .mk-input { width: 100%; border: 1.5px solid ${BRAND.purpleLight}; border-radius: 10px; padding: 12px 14px; font-family: 'Nunito', sans-serif; font-size: 14px; background: ${BRAND.white}; color: ${BRAND.text}; outline: none; transition: all 0.2s; font-weight: 500; }
          .mk-input:focus { border-color: ${BRAND.purple}; box-shadow: 0 0 0 3px rgba(155,142,196,0.15); }
          .mk-input::placeholder { color: ${BRAND.purpleLight}; }
          textarea.mk-input { resize: vertical; min-height: 100px; }
          .tag { font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
          .mk-primary { background: linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: white; border: none; border-radius: 8px; padding: 11px 22px; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
          .mk-primary:hover { opacity: 0.9; transform: translateY(-1px); }
          .mk-outline { background: transparent; color: ${BRAND.purpleDark}; border: 1.5px solid ${BRAND.purpleLight}; border-radius: 8px; padding: 9px 18px; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
          .mk-outline:hover { background: ${BRAND.purpleLight}20; }
          .mk-danger { background: transparent; color: #b42318; border: 1.5px solid #f4c2be; border-radius: 8px; padding: 7px 14px; font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
          .mk-danger:hover { background: #fff0ee; }
          .panel { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 20px; }
        `}</style>

        {/* ── Cats Tab ── */}
        {activeTab === "cats" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Cats</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Cat Management</h1>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Upload form */}
              <div className="panel" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Upload a Cat</div>
                <form onSubmit={handleUploadCat} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Cat name</div>
                    <input className="mk-input" value={upload.name} onChange={(e) => setUpload((c) => ({ ...c, name: e.target.value }))} placeholder="Nova" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Category</div>
                    <select className="mk-input" value={upload.category} onChange={(e) => setUpload((c) => ({ ...c, category: e.target.value as CatCategory }))}>
                      {CAT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Description</div>
                    <textarea className="mk-input" value={upload.description} onChange={(e) => setUpload((c) => ({ ...c, description: e.target.value }))} placeholder="A few lines about the cat's personality..." required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Image</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)} required />
                  </label>
                  {catMsg && <div style={{ fontSize: 13, color: BRAND.textLight, lineHeight: 1.5 }}>{catMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={saving}>{saving ? "Uploading…" : "Upload cat"}</button>
                </form>
              </div>

              {/* Cats preview */}
              <div>
                {Object.entries(groupedCats).map(([group, items]) => (
                  <div key={group} className="panel">
                    <div className="tag" style={{ color: BRAND.purple, marginBottom: 14 }}>{categoryLabel(group as CatCategory)} cats ({items.length})</div>
                    {items.length === 0
                      ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No cats in this group yet.</div>
                      : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                          {items.map((cat) => (
                            <div key={cat.id} style={{ border: `1.5px solid ${BRAND.purpleLight}`, borderRadius: 12, overflow: "hidden", background: BRAND.white }}>
                              {cat.images?.[0] && <img src={cat.images[0]} alt={cat.name} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />}
                              <div style={{ padding: 12 }}>
                                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{cat.name}</div>
                                <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 10, maxHeight: 60, overflow: "hidden" }}>{cat.description}</div>
                                <button className="mk-danger" onClick={() => handleDeleteCat(cat)} disabled={deletingCatId === cat.id}>
                                  {deletingCatId === cat.id ? "Removing…" : "Remove"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Menu Photos Tab ── */}
        {activeTab === "menu-images" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Content</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Menu Photos</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>
                Upload photos of your physical menu or food. These appear in a scrollable carousel on the Menu page. If you upload at least one, the built-in defaults are replaced.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              <div className="panel" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Upload Photo</div>
                <form onSubmit={handleUploadMenuImage} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Image</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setMenuImageFile(e.target.files?.[0] ?? null)} required />
                  </label>
                  {menuImageMsg && <div style={{ fontSize: 13, color: BRAND.textLight }}>{menuImageMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={menuImageSaving}>{menuImageSaving ? "Uploading…" : "Upload photo"}</button>
                </form>
              </div>

              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Current Photos ({menuImages.length})</div>
                {menuImages.length === 0
                  ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No photos yet.</div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                      {menuImages.map((img) => (
                        <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white }}>
                          <img src={img.url} alt="Menu" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {img.id.startsWith("builtin-") && <span style={{ fontSize: 11, color: BRAND.textLight }}>Built-in</span>}
                            <button
                              className="mk-danger"
                              onClick={() => handleDeleteMenuImage(img)}
                              disabled={deletingImageId === img.id}
                              style={{ marginLeft: "auto" }}
                            >
                              {deletingImageId === img.id ? "Deleting…" : img.id.startsWith("builtin-") ? "Can't delete" : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </>
        )}

        {/* ── Menu Items Tab ── */}
        {activeTab === "menu-items" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Content</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Menu Items</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>
                Add sections and items here. Once you have at least one section in the database, it replaces the built-in menu on the public site.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Add section */}
              <div className="panel" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Add Section</div>
                <form onSubmit={handleAddSection} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Section name</div>
                    <input className="mk-input" value={newSection.title} onChange={(e) => setNewSection((s) => ({ ...s, title: e.target.value }))} placeholder="Coffee" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Emoji</div>
                    <input className="mk-input" value={newSection.emoji} onChange={(e) => setNewSection((s) => ({ ...s, emoji: e.target.value }))} placeholder="☕" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Filter group</div>
                    <select className="mk-input" value={newSection.filterGroup} onChange={(e) => setNewSection((s) => ({ ...s, filterGroup: e.target.value }))}>
                      {MENU_FILTER_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  {menuMsg && <div style={{ fontSize: 13, color: BRAND.textLight }}>{menuMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={menuSaving}>{menuSaving ? "Saving…" : "Add section"}</button>
                </form>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BRAND.purpleLight}40` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.textLight, marginBottom: 8 }}>Built-in menu sections</div>
                  <div style={{ fontSize: 12, color: BRAND.textLight, lineHeight: 1.6 }}>
                    {DEFAULT_MENU.map((s) => `${s.emoji} ${s.title}`).join(" · ")}
                  </div>
                  <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 8 }}>These show on the public site until you add your own sections above.</div>
                </div>
              </div>

              {/* Sections list */}
              <div>
                {menuSections.length === 0 ? (
                  <div className="panel" style={{ color: BRAND.textLight, fontSize: 14 }}>
                    No custom sections yet. Add one on the left to start building your live menu.
                  </div>
                ) : menuSections.map((section) => (
                  <div key={section.id} className="panel">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 20, marginRight: 8 }}>{section.emoji}</span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: BRAND.text }}>{section.title}</span>
                        <span style={{ marginLeft: 10, fontSize: 11, background: `${BRAND.purple}18`, color: BRAND.purple, borderRadius: 999, padding: "2px 10px", fontWeight: 700 }}>{section.filterGroup}</span>
                      </div>
                      <button className="mk-danger" onClick={() => handleDeleteSection(section.id!)} disabled={deletingSectionId === section.id}>
                        {deletingSectionId === section.id ? "Deleting…" : "Delete section"}
                      </button>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: 14 }}>
                      {section.items.length === 0
                        ? <div style={{ fontSize: 13, color: BRAND.textLight }}>No items yet.</div>
                        : section.items.map((item) => (
                            <div key={item.id ?? item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: `${BRAND.purple}08`, marginBottom: 6 }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</span>
                                <span style={{ marginLeft: 12, color: BRAND.textLight, fontSize: 13 }}>{item.price}</span>
                              </div>
                              {item.id && (
                                <button className="mk-danger" onClick={() => handleDeleteItem(section.id!, item)} disabled={deletingItemId === item.id} style={{ padding: "4px 10px", fontSize: 11 }}>
                                  {deletingItemId === item.id ? "…" : "Remove"}
                                </button>
                              )}
                            </div>
                          ))
                      }
                    </div>

                    {/* Add item form */}
                    <form onSubmit={(e) => handleAddItem(e, section.id!)} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ flex: 2 }}>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Item name</div>
                        <input
                          className="mk-input"
                          style={{ padding: "9px 12px" }}
                          value={newItem[section.id!]?.name ?? ""}
                          onChange={(e) => setNewItem((n) => ({ ...n, [section.id!]: { ...n[section.id!] ?? { name: "", price: "" }, name: e.target.value } }))}
                          placeholder="Espresso"
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Price</div>
                        <input
                          className="mk-input"
                          style={{ padding: "9px 12px" }}
                          value={newItem[section.id!]?.price ?? ""}
                          onChange={(e) => setNewItem((n) => ({ ...n, [section.id!]: { ...n[section.id!] ?? { name: "", price: "" }, price: e.target.value } }))}
                          placeholder="R28"
                          required
                        />
                      </div>
                      <button className="mk-primary" type="submit" style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>+ Add item</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
