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

type SessionUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
};

type AuthState = {
  loading: boolean;
  user: SessionUser | null;
  error: string;
};

const emptyUpload: { name: string; description: string; category: CatCategory } = {
  name: "",
  description: "",
  category: "resident",
};

const HIDDEN_CAT_IDS_STORAGE_KEY = "meankat_hidden_cat_ids";

export default function AdminClient() {
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null, error: "" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [upload, setUpload] = useState(emptyUpload);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [cats, setCats] = useState<CatCard[]>(DEFAULT_CATS);
  const [saving, setSaving] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [hiddenCatIds, setHiddenCatIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDDEN_CAT_IDS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setHiddenCatIds(parsed.filter((value) => typeof value === "string"));
        }
      }
    } catch {
      setHiddenCatIds([]);
    }
  }, []);

  function persistHiddenCatIds(nextHiddenIds: string[]) {
    setHiddenCatIds(nextHiddenIds);
    try {
      window.localStorage.setItem(HIDDEN_CAT_IDS_STORAGE_KEY, JSON.stringify(nextHiddenIds));
    } catch {
      // Ignore storage errors and keep the current in-memory state.
    }
  }

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        setAuth({ loading: false, user: null, error: "" });
        return;
      }

      const data = await response.json();
      setAuth({ loading: false, user: data.user, error: "" });
    };

    load();
  }, []);

  useEffect(() => {
    const loadCats = async () => {
      const response = await fetch("/api/cats");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as CatCard[];
      const merged = mergeCatsByName(DEFAULT_CATS, data);
      setCats(merged.filter((cat) => !hiddenCatIds.includes(cat.id)));
    };

    loadCats();
  }, [auth.user, hiddenCatIds]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuth((current) => ({ ...current, error: "" }));
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });

    const responseText = await response.text();
    let data: { error?: string; user?: SessionUser } = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      const fallbackError = responseText || `Login failed with status ${response.status}.`;
      setAuth((current) => ({ ...current, error: data.error ?? fallbackError }));
      return;
    }

    setAuth({ loading: false, user: data.user, error: "" });
    setLoginPassword("");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ loading: false, user: null, error: "" });
    setLoginPassword("");
    setMessage("");
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedImage) {
      setMessage("Pick an image first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const formData = new FormData();
    formData.append("name", upload.name);
    formData.append("description", upload.description);
    formData.append("category", upload.category);
    formData.append("image", selectedImage);

    const response = await fetch("/api/admin/cats", {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    let data: { error?: string; warning?: string; cat?: CatCard; details?: string } = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {};
    }

    setSaving(false);

    if (!response.ok) {
      const fallbackError = responseText || `Upload failed with status ${response.status}.`;
      setMessage(data.error ? `${data.error}${data.details ? `\n${data.details}` : ""}` : fallbackError);
      return;
    }

    setCats((current) => [data.cat, ...current]);
    setUpload(emptyUpload);
    setSelectedImage(null);
    setMessage("Cat uploaded successfully.");
  }

  async function handleDeleteCat(cat: CatCard) {
    const confirmed = window.confirm(`Remove ${cat.name} from MeanKat?`);
    if (!confirmed) {
      return;
    }

    setDeletingCatId(cat.id);
    setMessage("");

    if (!isUploadedCat(cat)) {
      persistHiddenCatIds(Array.from(new Set([...hiddenCatIds, cat.id])));
      setCats((current) => current.filter((item) => item.id !== cat.id));
      setMessage(`${cat.name} removed from the admin preview.`);
      setDeletingCatId(null);
      return;
    }

    const response = await fetch(`/api/admin/cats/${cat.id}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Delete failed.");
      setDeletingCatId(null);
      return;
    }

    const refreshResponse = await fetch("/api/cats");
    if (refreshResponse.ok) {
      const refreshed = (await refreshResponse.json()) as CatCard[];
      setCats(mergeCatsByName(DEFAULT_CATS, refreshed).filter((item) => !hiddenCatIds.includes(item.id)));
    } else {
      setCats((current) => current.filter((item) => item.id !== cat.id));
    }

    setMessage(data.warning ?? "Cat removed successfully.");
    setDeletingCatId(null);
  }

  const groupedCats = {
    resident: cats.filter((cat) => cat.category === "resident"),
    adoptable: cats.filter((cat) => cat.category === "adoptable"),
    dual: cats.filter((cat) => cat.category === "dual"),
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.cream, color: BRAND.text, fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px clamp(16px, 5vw, 40px) 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          <div>
            <div className="tag" style={{ color: BRAND.purple, marginBottom: 8 }}>Admin</div>
            <h1 style={{ fontSize: "clamp(28px, 6vw, 52px)", fontWeight: 900, margin: 0 }}>MeanKat content control</h1>
          </div>
          <Link href="/" style={{ color: BRAND.purpleDark, textDecoration: "none", fontWeight: 700 }}>
            Back to site
          </Link>
        </div>

        {auth.loading ? (
          <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: 32 }}>
            Loading session...
          </div>
        ) : !auth.user ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, maxWidth: 520 }}>
            <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: 28, boxShadow: "0 8px 24px rgba(155,142,196,0.12)" }}>
              <h2 style={{ marginTop: 0, marginBottom: 10 }}>Admin login</h2>
              <p style={{ marginTop: 0, color: BRAND.textLight, lineHeight: 1.8 }}>
                Only approved admins can enter. This checks the `users` table, not Supabase Auth.
              </p>
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Email</div>
                  <input
                    className="mk-input"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    type="email"
                    placeholder="admin@meankatcafe.co.za"
                    required
                  />
                </label>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Password</div>
                  <input
                    className="mk-input"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    type="password"
                    placeholder="Password"
                    required
                  />
                </label>
                {auth.error ? <div style={{ color: "#b42318", fontSize: 14 }}>{auth.error}</div> : null}
                <button className="mk-primary" type="submit">
                  Log in
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
            <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: 28, boxShadow: "0 8px 24px rgba(155,142,196,0.12)", position: "sticky", top: 20 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 8 }}>Logged in</div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{auth.user.email}</div>
              <div style={{ color: BRAND.textLight, marginBottom: 20, lineHeight: 1.7 }}>Approved admin access is active.</div>

              <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Cat name</div>
                  <input
                    className="mk-input"
                    value={upload.name}
                    onChange={(event) => setUpload((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nova"
                    required
                  />
                </label>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Category</div>
                  <select
                    className="mk-input"
                    value={upload.category}
                    onChange={(event) => setUpload((current) => ({ ...current, category: event.target.value as CatCategory }))}
                  >
                    {CAT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Description</div>
                  <textarea
                    className="mk-input"
                    value={upload.description}
                    onChange={(event) => setUpload((current) => ({ ...current, description: event.target.value }))}
                    placeholder="A few lines about the cat's personality..."
                    rows={6}
                    required
                  />
                </label>
                <label>
                  <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>Image</div>
                  <input
                    className="mk-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
                    required
                  />
                </label>
                {message ? <div style={{ color: BRAND.textLight, fontSize: 14, lineHeight: 1.6 }}>{message}</div> : null}
                <button className="mk-primary" type="submit" disabled={saving}>
                  {saving ? "Uploading..." : "Upload cat"}
                </button>
                <button className="mk-outline" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </form>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ background: BRAND.white, border: `2px solid ${BRAND.purpleLight}`, borderRadius: 20, padding: 28, boxShadow: "0 8px 24px rgba(155,142,196,0.12)" }}>
                <h2 style={{ marginTop: 0 }}>Public cats preview</h2>
                <p style={{ color: BRAND.textLight, lineHeight: 1.8 }}>
                  Resident, adoptable, and dual adoption cats all show on the public site. Uploaded cats will appear after the next refresh.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  {Object.entries(groupedCats).map(([group, items]) => (
                    <div key={group} style={{ background: "rgba(155,142,196,0.06)", borderRadius: 16, padding: 16 }}>
                      <div className="tag" style={{ color: BRAND.purple, marginBottom: 10 }}>{categoryLabel(group as CatCategory)} cats</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {items.length > 0 ? items.map((cat) => (
                          <div key={cat.id} style={{ padding: 12, background: BRAND.white, borderRadius: 12 }}>
                            {cat.images?.[0] ? (
                              <div style={{ marginBottom: 10, borderRadius: 10, overflow: "hidden", background: "rgba(155,142,196,0.08)" }}>
                                <img
                                  src={cat.images[0]}
                                  alt={cat.name}
                                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                                />
                              </div>
                            ) : null}
                            <div style={{ fontWeight: 800 }}>{cat.name}</div>
                            <div
                              style={{
                                maxHeight: 110,
                                overflowY: "auto",
                                paddingRight: 8,
                                marginTop: 4,
                                fontSize: 13,
                                color: BRAND.textLight,
                                lineHeight: 1.6,
                                scrollbarWidth: "thin",
                                scrollbarColor: `${BRAND.purple} rgba(155,142,196,0.15)`,
                              }}
                            >
                              {cat.description}
                            </div>
                            <button
                              className="mk-outline"
                              type="button"
                              onClick={() => handleDeleteCat(cat)}
                              disabled={deletingCatId === cat.id}
                              style={{ marginTop: 10, padding: "8px 14px" }}
                            >
                              {deletingCatId === cat.id ? "Removing..." : "Remove cat"}
                            </button>
                          </div>
                        )) : <div style={{ color: BRAND.textLight, fontSize: 14 }}>No cats in this group yet.</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
