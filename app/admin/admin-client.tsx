"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CAT_CATEGORY_OPTIONS, DEFAULT_CATS, isUploadedCat, mergeCatsByName, type CatCard, type CatCategory, categoryLabel } from "@/lib/cats";

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
type AdminTab = "cats" | "menu-images" | "settings" | "users";
type AdminUser = { id: string; email: string; is_admin: boolean; is_approved: boolean; created_at: string };

const SETTINGS_DEFAULTS = {
  entrance_fee_1_price: "R50",
  entrance_fee_1_label: "Per person",
  entrance_fee_2_price: "R40",
  entrance_fee_2_label: "Students · weekdays (card req.)",
  entrance_fee_3_price: "R40",
  entrance_fee_3_label: "Pensioners",
  entrance_fee_4_price: "Free",
  entrance_fee_4_label: "Children under 1 year",
  stat_drinks: "30+",
  stat_desserts: "8+",
  hours_weekday: "Mon – Fri: 8am–6pm",
  hours_saturday: "Sat: 9am–6pm",
  hours_sunday: "Sun: 9am–5pm",
  hours_contact_weekday: "Mon – Fri: 08:00 – 17:00",
  hours_contact_weekend: "Sat – Sun: 09:00 – 16:00",
};
type SiteSettings = typeof SETTINGS_DEFAULTS;

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
  const [uploadingImageForId, setUploadingImageForId] = useState<string | null>(null);
  const [deletingImageDbId, setDeletingImageDbId] = useState<string | null>(null);

  // --- settings ---
  const [settings, setSettings] = useState<SiteSettings>(SETTINGS_DEFAULTS);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // --- users ---
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState({ email: "", password: "", is_admin: true, is_approved: true });
  const [userMsg, setUserMsg] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // --- menu images ---
  const [menuImages, setMenuImages] = useState<MenuImage[]>([]);
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [menuImageSaving, setMenuImageSaving] = useState(false);
  const [menuImageMsg, setMenuImageMsg] = useState("");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>([]);

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDDEN_CAT_IDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) setHiddenCatIds(parsed.filter((v) => typeof v === "string"));
      }
    } catch { setHiddenCatIds([]); }
    try {
      const stored = window.localStorage.getItem("meankat_hidden_menu_images");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) setHiddenBuiltinIds(parsed.filter((v) => typeof v === "string"));
      }
    } catch { }
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
      .then((imgs: MenuImage[]) => setMenuImages(imgs.filter((i) => !hiddenBuiltinIds.includes(i.id))))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data: SiteSettings | null) => { if (data) setSettings({ ...SETTINGS_DEFAULTS, ...data }); })
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminUser[]) => setAdminUsers(data))
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

  async function handleUploadCatImage(cat: CatCard, file: File, type: "after" | "before") {
    setUploadingImageForId(`${cat.id}-${type}`);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("type", type);
    const res = await fetch(`/api/admin/cats/${cat.id}/images`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploadingImageForId(null);
    if (!res.ok) { setCatMsg(data.error ?? "Upload failed."); return; }
    const { url, dbId: newDbId } = data.image as { url: string; dbId: string };
    setCats((c) => c.map((x) => {
      if (x.id !== cat.id) return x;
      if (type === "after") return { ...x, images: [...x.images, url], afterImageDbIds: [...(x.afterImageDbIds ?? []), newDbId] };
      return { ...x, beforeImages: [...(x.beforeImages ?? []), url], beforeImageDbIds: [...(x.beforeImageDbIds ?? []), newDbId] };
    }));
  }

  async function handleDeleteCatImage(cat: CatCard, dbId: string, type: "after" | "before") {
    if (!confirm("Remove this photo?")) return;
    setDeletingImageDbId(dbId);
    await fetch(`/api/admin/cats/${cat.id}/images/${dbId}`, { method: "DELETE" });
    setCats((c) => c.map((x) => {
      if (x.id !== cat.id) return x;
      if (type === "after") {
        const idx = (x.afterImageDbIds ?? []).indexOf(dbId);
        const images = x.images.filter((_, i) => i !== idx);
        const afterImageDbIds = (x.afterImageDbIds ?? []).filter((_, i) => i !== idx);
        return { ...x, images, afterImageDbIds };
      }
      const idx = (x.beforeImageDbIds ?? []).indexOf(dbId);
      const beforeImages = (x.beforeImages ?? []).filter((_, i) => i !== idx);
      const beforeImageDbIds = (x.beforeImageDbIds ?? []).filter((_, i) => i !== idx);
      return { ...x, beforeImages, beforeImageDbIds };
    }));
    setDeletingImageDbId(null);
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
      if (!confirm("Hide this built-in menu image? It will be removed from the site. You can restore it by clearing your browser data.")) return;
      const next = [...new Set([...hiddenBuiltinIds, img.id])];
      setHiddenBuiltinIds(next);
      try { window.localStorage.setItem("meankat_hidden_menu_images", JSON.stringify(next)); } catch { }
      setMenuImages((imgs) => imgs.filter((i) => i.id !== img.id));
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

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUserSaving(true); setUserMsg("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json().catch(() => ({}));
    setUserSaving(false);
    if (!res.ok) { setUserMsg(data.error ?? "Failed to create user."); return; }
    setAdminUsers((u) => [data.user, ...u]);
    setNewUser({ email: "", password: "", is_admin: true, is_approved: true });
    setUserMsg("User created successfully.");
  }

  async function handleDeleteUser(user: AdminUser) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setDeletingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setUserMsg(data.error ?? "Delete failed."); setDeletingUserId(null); return; }
    setAdminUsers((u) => u.filter((x) => x.id !== user.id));
    setDeletingUserId(null);
  }

  async function handleToggleUser(user: AdminUser, field: "is_approved" | "is_admin") {
    setTogglingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !user[field] }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAdminUsers((u) => u.map((x) => x.id === user.id ? data.user : x));
    else setUserMsg(data.error ?? "Update failed.");
    setTogglingUserId(null);
  }

  async function handleSaveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsSaving(true); setSettingsMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    setSettingsSaving(false);
    if (!res.ok) { setSettingsMsg(data.error ?? "Save failed."); return; }
    setSettingsMsg("Settings saved successfully.");
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
    { id: "settings", label: "Site Settings", icon: "⚙️" },
    { id: "users", label: "Users", icon: "👤" },
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
      <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Nunito', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Courier+Prime:wght@400;700&display=swap');
          * { box-sizing: border-box; }
          .mk-input { width: 100%; border: 1.5px solid ${BRAND.purpleLight}; border-radius: 10px; padding: 12px 14px; font-family: 'Nunito', sans-serif; font-size: 14px; background: ${BRAND.white}; color: ${BRAND.text}; outline: none; transition: all 0.2s; font-weight: 500; }
          .mk-input:focus { border-color: ${BRAND.purple}; box-shadow: 0 0 0 3px rgba(155,142,196,0.15); }
          .mk-input::placeholder { color: ${BRAND.purpleLight}; }
          .tag { font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
          .mk-primary { background: linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: white; border: none; border-radius: 10px; padding: 13px 22px; font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; width: 100%; }
          .mk-primary:hover { opacity: 0.9; transform: translateY(-1px); }
          .login-info-pill { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; }
        `}</style>

        {/* ── Left: Branding panel ── */}
        <div style={{ flex: 1, background: SIDEBAR_BG, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(32px, 6vw, 64px)", position: "relative", overflow: "hidden" }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: "rgba(155,142,196,0.12)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(240,216,74,0.07)", pointerEvents: "none" }} />

          <div>
            <Link href="/" style={{ display: "block", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 700, letterSpacing: 0.3, marginBottom: 48, transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              ← Back to site
            </Link>

            <div style={{ display: "inline-block", background: `${BRAND.yellow}22`, border: `1px solid ${BRAND.yellow}44`, borderRadius: 999, padding: "4px 14px", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: BRAND.yellow }}>Admin Portal</span>
            </div>
            <h1 style={{ margin: "0 0 14px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "white", lineHeight: 1.1 }}>
              MeanKat<br />Café
            </h1>
            <p style={{ margin: "0 0 40px", fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 340 }}>
              Manage your cats, photos, and content — all in one place.
            </p>
          </div>

          <div>
            <div className="login-info-pill">
              <span style={{ fontSize: 24 }}>🐾</span>
              <div>
                <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>Cat profiles</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Add, remove &amp; categorise cats</div>
              </div>
            </div>
            <div className="login-info-pill">
              <span style={{ fontSize: 24 }}>📸</span>
              <div>
                <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>Menu photos</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Upload &amp; manage menu images</div>
              </div>
            </div>
            <div className="login-info-pill" style={{ marginBottom: 0 }}>
              <span style={{ fontSize: 24 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>Secure access</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Approved admins only</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Login form ── */}
        <div style={{ width: "clamp(340px, 42vw, 520px)", background: BRAND.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(32px, 5vw, 64px)" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ marginBottom: 36 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 10 }}>Sign in</div>
              <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Welcome back</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: BRAND.textLight }}>Enter your credentials to access the admin panel.</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <label>
                <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Email address</div>
                <input className="mk-input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@meankatcafe.co.za" required />
              </label>
              <label>
                <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Password</div>
                <input className="mk-input" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••••" required />
              </label>
              {auth.error && (
                <div style={{ background: "#fff0ee", border: "1px solid #f4c2be", borderRadius: 8, padding: "10px 14px", color: "#b42318", fontSize: 13, fontWeight: 600 }}>
                  {auth.error}
                </div>
              )}
              <button className="mk-primary" type="submit">Log in →</button>
            </form>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${BRAND.purpleLight}50`, fontSize: 12, color: BRAND.textLight, lineHeight: 1.6 }}>
              Don&apos;t have access? Contact the café owner to get your account approved.
            </div>
          </div>
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
                              {cat.images?.[0] && <img src={cat.images[0]} alt={cat.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />}
                              <div style={{ padding: 12 }}>
                                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{cat.name}</div>
                                <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 10, maxHeight: 40, overflow: "hidden" }}>{cat.description}</div>

                                {isUploadedCat(cat) ? (
                                  <>
                                    {/* After photos */}
                                    <div style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>✨ After photos</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                        {cat.images.map((url, i) => {
                                          const dbId = cat.afterImageDbIds?.[i];
                                          return (
                                            <div key={i} style={{ position: "relative" }}>
                                              <img src={url} alt="after" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, border: `1.5px solid ${BRAND.purpleLight}`, display: "block" }} />
                                              {dbId && (
                                                <button onClick={() => handleDeleteCatImage(cat, dbId, "after")} disabled={deletingImageDbId === dbId}
                                                  style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#b42318", border: "none", color: "white", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                                              )}
                                            </div>
                                          );
                                        })}
                                        <label style={{ cursor: "pointer" }}>
                                          <div style={{ width: 52, height: 52, border: `1.5px dashed ${BRAND.purple}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: BRAND.purple, background: uploadingImageForId === `${cat.id}-after` ? `${BRAND.purple}10` : "transparent" }}>
                                            {uploadingImageForId === `${cat.id}-after` ? "…" : "+"}
                                          </div>
                                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCatImage(cat, f, "after"); e.target.value = ""; }} />
                                        </label>
                                      </div>
                                    </div>

                                    {/* Before photos */}
                                    <div style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>📷 Before photos</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                        {(cat.beforeImages ?? []).map((url, i) => {
                                          const dbId = cat.beforeImageDbIds?.[i];
                                          return (
                                            <div key={i} style={{ position: "relative" }}>
                                              <img src={url} alt="before" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, border: `1.5px solid ${BRAND.purpleLight}`, display: "block" }} />
                                              {dbId && (
                                                <button onClick={() => handleDeleteCatImage(cat, dbId, "before")} disabled={deletingImageDbId === dbId}
                                                  style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#b42318", border: "none", color: "white", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                                              )}
                                            </div>
                                          );
                                        })}
                                        <label style={{ cursor: "pointer" }}>
                                          <div style={{ width: 52, height: 52, border: `1.5px dashed ${BRAND.purple}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: BRAND.purple, background: uploadingImageForId === `${cat.id}-before` ? `${BRAND.purple}10` : "transparent" }}>
                                            {uploadingImageForId === `${cat.id}-before` ? "…" : "+"}
                                          </div>
                                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCatImage(cat, f, "before"); e.target.value = ""; }} />
                                        </label>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: 11, color: BRAND.textLight, fontStyle: "italic", border: `1.5px dashed ${BRAND.purpleLight}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                                    Re-upload this cat to enable before/after photos
                                  </div>
                                )}

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
                              {deletingImageId === img.id ? "Deleting…" : "Delete"}
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

        {/* ── Settings Tab ── */}
        {activeTab === "settings" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Site</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Site Settings</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Edit entrance fees, stats, and opening hours shown on the public site.</p>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

                {/* Left column */}
                <div>
                  {/* Stats */}
                  <div className="panel" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>📊 Homepage Stats</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Numbers shown on the home page stat cards.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>☕ Drinks on Menu</div>
                        <input className="mk-input" value={settings.stat_drinks} onChange={(e) => setSettings((s) => ({ ...s, stat_drinks: e.target.value }))} placeholder="30+" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>🍰 Fresh Desserts</div>
                        <input className="mk-input" value={settings.stat_desserts} onChange={(e) => setSettings((s) => ({ ...s, stat_desserts: e.target.value }))} placeholder="8+" />
                      </label>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🕐 Opening Hours</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Shown in the footer and on the Contact page.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Weekday (footer)</div>
                        <input className="mk-input" value={settings.hours_weekday} onChange={(e) => setSettings((s) => ({ ...s, hours_weekday: e.target.value }))} placeholder="Mon – Fri: 8am–6pm" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Saturday (footer)</div>
                        <input className="mk-input" value={settings.hours_saturday} onChange={(e) => setSettings((s) => ({ ...s, hours_saturday: e.target.value }))} placeholder="Sat: 9am–6pm" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Sunday (footer)</div>
                        <input className="mk-input" value={settings.hours_sunday} onChange={(e) => setSettings((s) => ({ ...s, hours_sunday: e.target.value }))} placeholder="Sun: 9am–5pm" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Weekday line (contact page)</div>
                        <input className="mk-input" value={settings.hours_contact_weekday} onChange={(e) => setSettings((s) => ({ ...s, hours_contact_weekday: e.target.value }))} placeholder="Mon – Fri: 08:00 – 17:00" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Weekend line (contact page)</div>
                        <input className="mk-input" value={settings.hours_contact_weekend} onChange={(e) => setSettings((s) => ({ ...s, hours_contact_weekend: e.target.value }))} placeholder="Sat – Sun: 09:00 – 16:00" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div>
                  {/* Entrance Fees */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🎟️ Entrance Fees</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Shown on the home page fee card and the Menu page notice.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {[
                        ["entrance_fee_1_price", "entrance_fee_1_label", "Adult"],
                        ["entrance_fee_2_price", "entrance_fee_2_label", "Student"],
                        ["entrance_fee_3_price", "entrance_fee_3_label", "Pensioner"],
                        ["entrance_fee_4_price", "entrance_fee_4_label", "Child"],
                      ].map(([priceKey, labelKey, row]) => (
                        <div key={row} style={{ background: `${BRAND.purple}08`, borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.text, marginBottom: 10 }}>{row}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                            <label>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6, fontSize: 10 }}>Price</div>
                              <input className="mk-input" value={settings[priceKey as keyof SiteSettings]} onChange={(e) => setSettings((s) => ({ ...s, [priceKey]: e.target.value }))} placeholder="R50" />
                            </label>
                            <label>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6, fontSize: 10 }}>Description</div>
                              <input className="mk-input" value={settings[labelKey as keyof SiteSettings]} onChange={(e) => setSettings((s) => ({ ...s, [labelKey]: e.target.value }))} placeholder="Per person" />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
                <button className="mk-primary" type="submit" disabled={settingsSaving} style={{ fontSize: 15, padding: "13px 28px" }}>
                  {settingsSaving ? "Saving…" : "Save Settings"}
                </button>
                {settingsMsg && <div style={{ fontSize: 13, fontWeight: 700, color: settingsMsg.includes("success") ? "#16a34a" : "#b42318" }}>{settingsMsg}</div>}
              </div>
            </form>
          </>
        )}

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Access</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Users</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Create and manage admin accounts. Only approved admins can log in.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Create user form */}
              <div className="panel" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Create New User</div>
                <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Email address</div>
                    <input className="mk-input" type="email" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} placeholder="user@meankatcafe.co.za" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Password (min 8 chars)</div>
                    <input className="mk-input" type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} placeholder="••••••••••" required minLength={8} />
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={newUser.is_admin} onChange={(e) => setNewUser((u) => ({ ...u, is_admin: e.target.checked }))} style={{ width: 16, height: 16, accentColor: BRAND.purple }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.text }}>Admin</div>
                        <div style={{ fontSize: 11, color: BRAND.textLight }}>Can access the admin panel</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={newUser.is_approved} onChange={(e) => setNewUser((u) => ({ ...u, is_approved: e.target.checked }))} style={{ width: 16, height: 16, accentColor: BRAND.purple }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.text }}>Approved</div>
                        <div style={{ fontSize: 11, color: BRAND.textLight }}>Uncheck to create a pending account</div>
                      </div>
                    </label>
                  </div>
                  {userMsg && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: userMsg.includes("success") ? "#16a34a" : "#b42318", background: userMsg.includes("success") ? "#f0fdf4" : "#fff0ee", border: `1px solid ${userMsg.includes("success") ? "#bbf7d0" : "#f4c2be"}`, borderRadius: 8, padding: "10px 14px" }}>
                      {userMsg}
                    </div>
                  )}
                  <button className="mk-primary" type="submit" disabled={userSaving}>{userSaving ? "Creating…" : "Create user"}</button>
                </form>
              </div>

              {/* Users list */}
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>All Users ({adminUsers.length})</div>
                {adminUsers.length === 0 ? (
                  <div style={{ color: BRAND.textLight, fontSize: 14 }}>No users yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {adminUsers.map((user) => (
                      <div key={user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text, wordBreak: "break-all" }}>{user.email}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: user.is_admin ? `${BRAND.purple}18` : "rgba(0,0,0,0.05)", color: user.is_admin ? BRAND.purple : BRAND.textLight }}>
                              {user.is_admin ? "Admin" : "Non-admin"}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: user.is_approved ? "rgba(22,163,74,0.1)" : "rgba(180,35,24,0.08)", color: user.is_approved ? "#16a34a" : "#b42318" }}>
                              {user.is_approved ? "Approved" : "Pending"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 4 }}>
                            Created {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                          <button
                            className="mk-outline"
                            style={{ padding: "6px 12px", fontSize: 12 }}
                            onClick={() => handleToggleUser(user, "is_approved")}
                            disabled={togglingUserId === user.id}
                          >
                            {user.is_approved ? "Revoke" : "Approve"}
                          </button>
                          <button
                            className="mk-danger"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
