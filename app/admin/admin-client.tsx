"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { CAT_CATEGORY_OPTIONS, DEFAULT_IMAGE_TRANSFORM, isUploadedCat, type CatCard, type CatCategory, type ImageTransform, categoryLabel } from "@/lib/cats";
import { transformToStyle } from "@/lib/image-transform";
import { VOLUNTEER_ALL_FIELDS, answerToText, type VolunteerAnswers } from "@/lib/volunteer";
import { HELP_POSTER_SLOTS, posterUrlKey, imageUrlKey } from "@/lib/help-posters";
import { compressImage } from "@/lib/compress-image";
import { DEFAULT_WEEK, parseWeek, slotsForDate, CAFE_TZ, WEEKDAY_FULL, DISPLAY_ORDER, type WeekHours, type DayHours, type TimeRange } from "@/lib/hours";
import { SHOP_CATEGORIES, CATEGORY_TILE, type Product, type Order, type OrderStatus, type ShopCategory } from "@/lib/shop";

type CropTarget = { catId: string; type: "after" | "before"; index: number; dbId: string | null; url: string; transform: ImageTransform };

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

type UserRole = "admin" | "volunteer";
type SessionUser = { id: string; email: string; isAdmin: boolean; isApproved: boolean; role: UserRole };
type AuthState = { loading: boolean; user: SessionUser | null; error: string };
type MenuImage = { id: string; url: string };
type AdminTab = "cats" | "menu-images" | "settings" | "users" | "events" | "volunteers" | "bookings" | "members" | "products" | "orders";

type ProductForm = {
  name: string;
  category: ShopCategory;
  priceRands: string;
  description: string;
  badge: string;
  emoji: string;
  stock: string;
  active: boolean;
};

const emptyProductForm: ProductForm = {
  name: "",
  category: "Treats",
  priceRands: "",
  description: "",
  badge: "",
  emoji: "",
  stock: "",
  active: true,
};
type SettingsSubTab = "general" | "banner" | "donate" | "help" | "access";
const SETTINGS_SUBTABS: { key: SettingsSubTab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "banner", label: "Announcement" },
  { key: "donate", label: "Donations" },
  { key: "help", label: "Foster & Help" },
  { key: "access", label: "Permissions" },
];
type AdminMember = { id: string; name: string; email: string; phone?: string | null; planId?: string | null; planName?: string | null; price?: string | null; status: "pending" | "active" | "cancelled"; paidDate?: string | null; validUntil?: string | null; memberCode: string; notes?: string | null; memberNames?: string[] | null; extraMembers?: number | null; createdAt: string };
type AdminPlan = { id: string; name: string; price: string; periodMonths: number; description?: string | null; active: boolean; displayOrder: number };
type AdminBooking = { id: string; date: string; slot: string; name: string; email: string; phone?: string | null; partySize: number; actualPartySize?: number | null; arrivedAt?: string | null; status: string; createdAt: string };
type AdminBlock = { id: string; date: string; startTime: string; endTime: string; title: string; price?: string | null; notes?: string | null };
type AdminEvent = { id: string; title: string; description: string; date: string; time?: string; imageUrl?: string | null; createdAt: string };
type AdminUser = { id: string; email: string; is_admin: boolean; is_approved: boolean; role: UserRole; created_at: string };
type VolunteerApplication = { id: string; fullName: string; email: string; whatsappNumber?: string | null; suburb?: string | null; agreeTerms: boolean; answers: VolunteerAnswers; createdAt: string };

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
  opening_hours: "", // JSON: WeekHours (see lib/hours.ts). Empty = DEFAULT_WEEK.
  contact_address: "87 Smiso Nkwanyana Road\nMorningside, Durban\nKwa-Zulu Natal",
  contact_maps_url: "https://www.google.com/maps/search/?api=1&query=87%20Smiso%20Nkwanyana%20Road%2C%20Morningside%2C%20Durban%2C%20KwaZulu-Natal",
  contact_phone: "+27 (0)31 000 0000",
  contact_whatsapp_url: "https://wa.me/",
  contact_email: "hello@meankatcafe.co.za",
  contact_socials: "@meankatcafe_durban on Instagram, TikTok & Facebook",
  bookings_per_slot: "6",
  announcement_text: "🎉 Banner for Updates / Events / Important Notices",
  announcement_enabled: "true",
  announcement_speed: "30",
  bank_account_name: "MeanKat Cafe NPC",
  bank_name: "",
  bank_account_number: "",
  bank_branch_code: "",
  bank_account_type: "",
  bank_reference: "Your name + \"Donation\"",
  backabuddy_links: "",
  donate_wishlist: "",
  secure_pay_url: "",
  volunteer_permissions: "cats,events,bookings,volunteers",
  foster_intro: "We wouldn't have a single cat without our incredible foster network. They pull cats from unsafe situations, nurse them back to health, and pour love into them until they're ready for their forever homes. They are the heart of everything we do at MeanKat.",
  foster_list: "Suzanne Kunz — PMB Kitten Fostering & Rescue | The incredible rescue work that inspired MeanKat Café. We work closely with Suzanne on urgent rehoming cases.",
  adopt_poster_url: "",
  adopt_poster_path: "",
  volunteer_poster_url: "",
  volunteer_poster_path: "",
  donate_poster_url: "",
  donate_poster_path: "",
  events_poster_url: "",
  events_poster_path: "",
  adopt_image_url: "",
  adopt_image_path: "",
  volunteer_image_url: "",
  volunteer_image_path: "",
  donate_image_url: "",
  donate_image_path: "",
  events_image_url: "",
  events_image_path: "",
};
type SiteSettings = typeof SETTINGS_DEFAULTS;

type CatFields = { name: string; description: string; category: CatCategory; tagline: string; whereToFind: string; howToMakeHappy: string; howToHelp: string };
const emptyUpload: CatFields = {
  name: "",
  description: "",
  category: "resident",
  tagline: "",
  whereToFind: "",
  howToMakeHappy: "",
  howToHelp: "",
};

// Clock time (HH:MM) in the café timezone for an ISO timestamp.
function fmtClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: CAFE_TZ });
}
// One hour after the given timestamp — when a guest's hour is up.
function plusHourClock(iso: string) {
  return new Date(new Date(iso).getTime() + 3600000).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: CAFE_TZ });
}

export default function AdminClient() {
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null, error: "" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("cats");

  // --- cats ---
  const [upload, setUpload] = useState<CatFields>(emptyUpload);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [cats, setCats] = useState<CatCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [catMsg, setCatMsg] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catEditForm, setCatEditForm] = useState<CatFields>(emptyUpload);
  const [catEditSaving, setCatEditSaving] = useState(false);
  const [uploadingImageForId, setUploadingImageForId] = useState<string | null>(null);
  const [deletingImageDbId, setDeletingImageDbId] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [cropSaving, setCropSaving] = useState(false);

  // --- settings ---
  const [settings, setSettings] = useState<SiteSettings>(SETTINGS_DEFAULTS);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("general");
  const [hoursWeek, setHoursWeek] = useState<WeekHours>(DEFAULT_WEEK);
  const [posterUploadingSlot, setPosterUploadingSlot] = useState<string | null>(null);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // --- users ---
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState<{ email: string; password: string; is_admin: boolean; is_approved: boolean; role: UserRole }>({ email: "", password: "", is_admin: true, is_approved: true, role: "admin" });
  const [userMsg, setUserMsg] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ email: "", password: "" });
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // --- events ---
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", date: "", time: "" });
  const [newEventImage, setNewEventImage] = useState<File | null>(null);
  const [eventMsg, setEventMsg] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState({ title: "", description: "", date: "", time: "" });
  const [editEventImage, setEditEventImage] = useState<File | null>(null);
  const [editEventSaving, setEditEventSaving] = useState(false);

  const [volunteers, setVolunteers] = useState<VolunteerApplication[]>([]);
  const [expandedVolunteerId, setExpandedVolunteerId] = useState<string | null>(null);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<string | null>(null);
  const [volunteerMsg, setVolunteerMsg] = useState("");

  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingMonth, setBookingMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [selectedBookingDate, setSelectedBookingDate] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [arrivingBookingId, setArrivingBookingId] = useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [bookingEditForm, setBookingEditForm] = useState({ name: "", phone: "", partySize: "1", actualPartySize: "" });
  const [bookingEditSaving, setBookingEditSaving] = useState(false);
  const [newBooking, setNewBooking] = useState({ slot: "", name: "", phone: "", email: "", partySize: "1" });
  const [bookingAddSaving, setBookingAddSaving] = useState(false);
  const [bookingAddMsg, setBookingAddMsg] = useState("");

  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [newBlock, setNewBlock] = useState({ date: "", startTime: "", endTime: "", title: "", price: "", notes: "" });
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockMsg, setBlockMsg] = useState("");
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [memberPlans, setMemberPlans] = useState<AdminPlan[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [newMember, setNewMember] = useState({ name: "", email: "", phone: "", planId: "" });
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberMsg, setMemberMsg] = useState("");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [payDates, setPayDates] = useState<Record<string, string>>({});
  const [newPlan, setNewPlan] = useState({ name: "", price: "", periodMonths: "1", description: "" });
  const [planSaving, setPlanSaving] = useState(false);

  // --- shop products ---
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<ProductForm>(emptyProductForm);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productMsg, setProductMsg] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ProductForm>(emptyProductForm);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [editProductSaving, setEditProductSaving] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // --- shop storefront hero image ---
  const [shopHeroUrl, setShopHeroUrl] = useState<string | null>(null);
  const [shopHeroFile, setShopHeroFile] = useState<File | null>(null);
  const [shopHeroSaving, setShopHeroSaving] = useState(false);
  const [shopHeroMsg, setShopHeroMsg] = useState("");

  // --- shop orders ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<"all" | OrderStatus>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderMsg, setOrderMsg] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // --- menu images ---
  const [menuImages, setMenuImages] = useState<MenuImage[]>([]);
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [menuImageSaving, setMenuImageSaving] = useState(false);
  const [menuImageMsg, setMenuImageMsg] = useState("");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>([]);

  const [cafeImages, setCafeImages] = useState<MenuImage[]>([]);
  const [cafeImageFile, setCafeImageFile] = useState<File | null>(null);
  const [cafeImageSaving, setCafeImageSaving] = useState(false);
  const [cafeImageMsg, setCafeImageMsg] = useState("");
  const [deletingCafeImageId, setDeletingCafeImageId] = useState<string | null>(null);

  const [catHeroImages, setCatHeroImages] = useState<MenuImage[]>([]);
  const [catHeroFile, setCatHeroFile] = useState<File | null>(null);
  const [catHeroSaving, setCatHeroSaving] = useState(false);
  const [catHeroMsg, setCatHeroMsg] = useState("");
  const [deletingCatHeroId, setDeletingCatHeroId] = useState<string | null>(null);

  const [ruleImages, setRuleImages] = useState<MenuImage[]>([]);
  const [ruleFile, setRuleFile] = useState<File | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleMsg, setRuleMsg] = useState("");
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const [galleries, setGalleries] = useState<Record<string, MenuImage[]>>({ about: [], home2: [] });
  const [galleryFile, setGalleryFile] = useState<Record<string, File | null>>({ about: null, home2: null, membership: null });
  const [gallerySaving, setGallerySaving] = useState<string | null>(null);
  const [galleryMsg, setGalleryMsg] = useState("");
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
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

  // Volunteers land on (and are kept within) their permitted tabs.
  useEffect(() => {
    if (!auth.user || auth.user.role !== "volunteer") return;
    const perms = settings.volunteer_permissions.split(",").map((s) => s.trim()).filter(Boolean);
    const tabArea: Record<AdminTab, string | null> = {
      cats: "cats", events: "events", bookings: "bookings", volunteers: "volunteers", members: "members",
      products: "products", orders: "orders",
      "menu-images": null, settings: null, users: null,
    };
    const allowed = (Object.keys(tabArea) as AdminTab[]).filter((t) => {
      const a = tabArea[t];
      return a && perms.includes(a);
    });
    setActiveTab((cur) => (allowed.includes(cur) ? cur : (allowed[0] ?? cur)));
  }, [auth.user, settings.volunteer_permissions]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/cats?all=1")
      .then((r) => r.ok ? r.json() : [])
      .then((data: CatCard[]) => setCats(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/menu-images")
      .then((r) => r.ok ? r.json() : [])
      .then((imgs: MenuImage[]) => setMenuImages(imgs.filter((i) => !hiddenBuiltinIds.includes(i.id))))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/cafe-images")
      .then((r) => r.ok ? r.json() : [])
      .then((imgs: MenuImage[]) => setCafeImages(imgs))
      .catch(() => {});
    fetch("/api/cat-hero-images")
      .then((r) => r.ok ? r.json() : [])
      .then((imgs: MenuImage[]) => setCatHeroImages(imgs))
      .catch(() => {});
    fetch("/api/cafe-rules-images")
      .then((r) => r.ok ? r.json() : [])
      .then((imgs: MenuImage[]) => setRuleImages(imgs))
      .catch(() => {});
    (["about", "home2", "membership"] as const).forEach((sec) => {
      fetch(`/api/gallery?section=${sec}`)
        .then((r) => r.ok ? r.json() : [])
        .then((imgs: MenuImage[]) => setGalleries((g) => ({ ...g, [sec]: imgs })))
        .catch(() => {});
    });
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data: SiteSettings | null) => {
        if (data) {
          setSettings({ ...SETTINGS_DEFAULTS, ...data });
          setHoursWeek(parseWeek((data as Record<string, string>).opening_hours));
        }
      })
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminUser[]) => setAdminUsers(data))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/events")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminEvent[]) => setAdminEvents(data))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/volunteers")
      .then((r) => r.ok ? r.json() : [])
      .then((data: VolunteerApplication[]) => setVolunteers(data))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/bookings")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminBooking[]) => setBookings(data))
      .catch(() => {});
    fetch("/api/admin/booking-blocks")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminBlock[]) => setBlocks(data))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/members")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminMember[]) => setMembers(data))
      .catch(() => {});
    fetch("/api/admin/membership-plans")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdminPlan[]) => setMemberPlans(data))
      .catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    fetch("/api/admin/products")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Product[]) => Array.isArray(data) && setProducts(data))
      .catch(() => {});
    fetch("/api/admin/orders")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Order[]) => Array.isArray(data) && setOrders(data))
      .catch(() => {});
    fetch("/api/shop-hero")
      .then((r) => r.ok ? r.json() : { imageUrl: null })
      .then((data: { imageUrl: string | null }) => setShopHeroUrl(data.imageUrl))
      .catch(() => {});
  }, [auth.user]);

  // ── helpers ───────────────────────────────────────────────────────────────


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
    fd.append("tagline", upload.tagline);
    fd.append("whereToFind", upload.whereToFind);
    fd.append("howToMakeHappy", upload.howToMakeHappy);
    fd.append("howToHelp", upload.howToHelp);
    fd.append("image", await compressImage(selectedImage));
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
    if (!confirm(`Remove ${cat.name}? This permanently deletes the cat.`)) return;
    setDeletingCatId(cat.id); setCatMsg("");
    const res = await fetch(`/api/admin/cats/${cat.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setCatMsg(data.error ?? "Delete failed."); setDeletingCatId(null); return; }
    setCats((c) => c.filter((x) => x.id !== cat.id));
    setCatMsg(data.warning ?? "Cat removed.");
    setDeletingCatId(null);
  }

  async function handleToggleHiddenCat(cat: CatCard) {
    const hidden = !cat.hidden;
    setCats((c) => c.map((x) => (x.id === cat.id ? { ...x, hidden } : x)));
    const res = await fetch(`/api/admin/cats/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { hidden } }),
    });
    if (!res.ok) {
      // Revert on failure.
      setCats((c) => c.map((x) => (x.id === cat.id ? { ...x, hidden: !hidden } : x)));
      setCatMsg("Could not update visibility.");
    }
  }

  function handleStartEditCat(cat: CatCard) {
    setEditingCatId(cat.id);
    setCatEditForm({
      name: cat.name,
      description: cat.description,
      category: cat.category,
      tagline: cat.tagline ?? "",
      whereToFind: cat.whereToFind ?? "",
      howToMakeHappy: cat.howToMakeHappy ?? "",
      howToHelp: cat.howToHelp ?? "",
    });
    setCatMsg("");
  }

  async function handleSaveCatFields(e: FormEvent<HTMLFormElement>, catId: string) {
    e.preventDefault();
    setCatEditSaving(true); setCatMsg("");
    const res = await fetch(`/api/admin/cats/${catId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: catEditForm }),
    });
    const data = await res.json().catch(() => ({}));
    setCatEditSaving(false);
    if (!res.ok) { setCatMsg(data.error ?? "Update failed."); return; }
    setCats((c) => c.map((x) => x.id === catId ? { ...x, ...catEditForm } : x));
    setEditingCatId(null);
    setCatMsg("Cat updated.");
  }

  async function handleUploadCatImage(cat: CatCard, file: File, type: "after" | "before") {
    setUploadingImageForId(`${cat.id}-${type}`);
    const fd = new FormData();
    fd.append("image", await compressImage(file));
    fd.append("type", type);
    const res = await fetch(`/api/admin/cats/${cat.id}/images`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploadingImageForId(null);
    if (!res.ok) { setCatMsg(data.error ?? "Upload failed."); return; }
    const { url, id: newDbId } = data.image as { url: string; id: string };
    setCats((c) => c.map((x) => {
      if (x.id !== cat.id) return x;
      if (type === "after") return { ...x, images: [...x.images, url], afterImageDbIds: [...(x.afterImageDbIds ?? []), newDbId], imageTransforms: [...(x.imageTransforms ?? []), null] };
      return { ...x, beforeImages: [...(x.beforeImages ?? []), url], beforeImageDbIds: [...(x.beforeImageDbIds ?? []), newDbId], beforeImageTransforms: [...(x.beforeImageTransforms ?? []), null] };
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
        const imageTransforms = (x.imageTransforms ?? []).filter((_, i) => i !== idx);
        return { ...x, images, afterImageDbIds, imageTransforms };
      }
      const idx = (x.beforeImageDbIds ?? []).indexOf(dbId);
      const beforeImages = (x.beforeImages ?? []).filter((_, i) => i !== idx);
      const beforeImageDbIds = (x.beforeImageDbIds ?? []).filter((_, i) => i !== idx);
      const beforeImageTransforms = (x.beforeImageTransforms ?? []).filter((_, i) => i !== idx);
      return { ...x, beforeImages, beforeImageDbIds, beforeImageTransforms };
    }));
    setDeletingImageDbId(null);
  }

  async function handleSaveCrop(target: CropTarget, transform: ImageTransform) {
    setCropSaving(true);
    try {
      const url = target.dbId
        ? `/api/admin/cats/${target.catId}/images/${target.dbId}`
        : `/api/admin/cats/${target.catId}`;
      const body = target.dbId
        ? { transform }
        : { target: target.type, transform };
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCatMsg(data.error ?? "Could not save crop."); return; }
      const saved = (data.transform ?? null) as ImageTransform | null;
      setCats((c) => c.map((x) => {
        if (x.id !== target.catId) return x;
        if (target.type === "after") {
          const imageTransforms = [...(x.imageTransforms ?? x.images.map(() => null))];
          imageTransforms[target.index] = saved;
          return { ...x, imageTransforms };
        }
        const beforeImageTransforms = [...(x.beforeImageTransforms ?? (x.beforeImages ?? []).map(() => null))];
        beforeImageTransforms[target.index] = saved;
        return { ...x, beforeImageTransforms };
      }));
      setCropTarget(null);
    } finally {
      setCropSaving(false);
    }
  }

  function openCrop(cat: CatCard, type: "after" | "before", index: number) {
    const dbId = (type === "after" ? cat.afterImageDbIds?.[index] : cat.beforeImageDbIds?.[index]) ?? null;
    const url = (type === "after" ? cat.images[index] : (cat.beforeImages ?? [])[index]) ?? "";
    const transform = (type === "after" ? cat.imageTransforms?.[index] : cat.beforeImageTransforms?.[index]) ?? null;
    setCropTarget({ catId: cat.id, type, index, dbId, url, transform: transform ?? { ...DEFAULT_IMAGE_TRANSFORM } });
  }

  // ── menu images ───────────────────────────────────────────────────────────

  async function handleUploadMenuImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!menuImageFile) { setMenuImageMsg("Pick an image first."); return; }
    setMenuImageSaving(true); setMenuImageMsg("");
    const fd = new FormData();
    fd.append("image", await compressImage(menuImageFile));
    const res = await fetch("/api/admin/menu-images", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setMenuImageSaving(false);
    if (!res.ok) { setMenuImageMsg(data.error ?? "Upload failed."); return; }
    setMenuImages((imgs) => [...imgs, data.image]);
    setMenuImageFile(null);
    setMenuImageMsg("Image uploaded.");
  }

  async function handleUploadCafeImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cafeImageFile) { setCafeImageMsg("Pick an image first."); return; }
    setCafeImageSaving(true); setCafeImageMsg("");
    const fd = new FormData();
    fd.append("image", await compressImage(cafeImageFile));
    const res = await fetch("/api/admin/cafe-images", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setCafeImageSaving(false);
    if (!res.ok) { setCafeImageMsg(data.error ?? "Upload failed."); return; }
    setCafeImages((imgs) => [...imgs, data.image]);
    setCafeImageFile(null);
    setCafeImageMsg("Image uploaded.");
  }

  async function handleDeleteCafeImage(img: MenuImage) {
    if (!confirm("Delete this café photo?")) return;
    setDeletingCafeImageId(img.id);
    const res = await fetch(`/api/admin/cafe-images/${img.id}`, { method: "DELETE" });
    if (res.ok) setCafeImages((imgs) => imgs.filter((i) => i.id !== img.id));
    setDeletingCafeImageId(null);
  }

  async function handleUploadCatHero(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!catHeroFile) { setCatHeroMsg("Pick an image first."); return; }
    setCatHeroSaving(true); setCatHeroMsg("");
    const fd = new FormData();
    fd.append("image", await compressImage(catHeroFile));
    const res = await fetch("/api/admin/cat-hero-images", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setCatHeroSaving(false);
    if (!res.ok) { setCatHeroMsg(data.error ?? "Upload failed."); return; }
    setCatHeroImages((imgs) => [...imgs, data.image]);
    setCatHeroFile(null);
    setCatHeroMsg("Image uploaded.");
  }

  async function handleDeleteCatHero(img: MenuImage) {
    if (!confirm("Delete this Cat Hero Guide image?")) return;
    setDeletingCatHeroId(img.id);
    const res = await fetch(`/api/admin/cat-hero-images/${img.id}`, { method: "DELETE" });
    if (res.ok) setCatHeroImages((imgs) => imgs.filter((i) => i.id !== img.id));
    setDeletingCatHeroId(null);
  }

  async function handleUploadRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ruleFile) { setRuleMsg("Pick an image first."); return; }
    setRuleSaving(true); setRuleMsg("");
    const fd = new FormData();
    fd.append("image", await compressImage(ruleFile));
    const res = await fetch("/api/admin/cafe-rules-images", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setRuleSaving(false);
    if (!res.ok) { setRuleMsg(data.error ?? "Upload failed."); return; }
    setRuleImages((imgs) => [...imgs, data.image]);
    setRuleFile(null);
    setRuleMsg("Image uploaded.");
  }

  async function handleDeleteRule(img: MenuImage) {
    if (!confirm("Delete this café rules image?")) return;
    setDeletingRuleId(img.id);
    const res = await fetch(`/api/admin/cafe-rules-images/${img.id}`, { method: "DELETE" });
    if (res.ok) setRuleImages((imgs) => imgs.filter((i) => i.id !== img.id));
    setDeletingRuleId(null);
  }

  async function handleUploadGallery(e: FormEvent<HTMLFormElement>, section: string) {
    e.preventDefault();
    const file = galleryFile[section];
    if (!file) { setGalleryMsg("Pick an image first."); return; }
    setGallerySaving(section); setGalleryMsg("");
    const fd = new FormData();
    fd.append("section", section);
    fd.append("image", await compressImage(file));
    const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setGallerySaving(null);
    if (!res.ok) { setGalleryMsg(data.error ?? "Upload failed."); return; }
    setGalleries((g) => ({ ...g, [section]: [...(g[section] ?? []), data.image] }));
    setGalleryFile((f) => ({ ...f, [section]: null }));
    setGalleryMsg("Image uploaded.");
  }

  async function handleDeleteGallery(section: string, img: MenuImage) {
    if (!confirm("Delete this image?")) return;
    setDeletingGalleryId(img.id);
    const res = await fetch(`/api/admin/gallery/${img.id}`, { method: "DELETE" });
    if (res.ok) setGalleries((g) => ({ ...g, [section]: (g[section] ?? []).filter((i) => i.id !== img.id) }));
    setDeletingGalleryId(null);
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
    setNewUser({ email: "", password: "", is_admin: true, is_approved: true, role: "admin" });
    setUserMsg("User created successfully.");
  }

  const VOLUNTEER_AREA_OPTIONS: { key: string; label: string }[] = [
    { key: "cats", label: "Cats" },
    { key: "events", label: "Events" },
    { key: "bookings", label: "Bookings" },
    { key: "members", label: "Members (door check)" },
    { key: "volunteers", label: "Volunteer applications" },
    { key: "products", label: "Shop products" },
    { key: "orders", label: "Shop orders" },
  ];

  function toggleVolPerm(key: string) {
    setSettings((s) => {
      const set = new Set(s.volunteer_permissions.split(",").map((x) => x.trim()).filter(Boolean));
      if (set.has(key)) set.delete(key); else set.add(key);
      return { ...s, volunteer_permissions: Array.from(set).join(",") };
    });
  }

  async function handleChangeRole(user: AdminUser, role: UserRole) {
    setTogglingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAdminUsers((u) => u.map((x) => x.id === user.id ? data.user : x));
    else setUserMsg(data.error ?? "Update failed.");
    setTogglingUserId(null);
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

  async function handleCreateEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEventSaving(true); setEventMsg("");
    const fd = new FormData();
    fd.append("title", newEvent.title);
    fd.append("description", newEvent.description);
    fd.append("date", newEvent.date);
    if (newEvent.time) fd.append("time", newEvent.time);
    if (newEventImage) fd.append("image", await compressImage(newEventImage));
    const res = await fetch("/api/admin/events", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setEventSaving(false);
    if (!res.ok) { setEventMsg(data.error ?? "Failed to create event."); return; }
    setAdminEvents((ev) => [data.event, ...ev].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewEvent({ title: "", description: "", date: "", time: "" });
    setNewEventImage(null);
    setEventMsg("Event created successfully.");
  }

  async function handleDeleteEvent(ev: AdminEvent) {
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setDeletingEventId(ev.id);
    const res = await fetch(`/api/admin/events/${ev.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setEventMsg(data.error ?? "Delete failed."); setDeletingEventId(null); return; }
    setAdminEvents((evs) => evs.filter((x) => x.id !== ev.id));
    setDeletingEventId(null);
  }

  function handleStartEditEvent(ev: AdminEvent) {
    setEditingEventId(ev.id);
    setEditEvent({ title: ev.title, description: ev.description, date: ev.date, time: ev.time ?? "" });
    setEditEventImage(null);
    setEventMsg("");
  }

  async function handleSaveEditEvent(e: FormEvent<HTMLFormElement>, eventId: string) {
    e.preventDefault();
    setEditEventSaving(true); setEventMsg("");
    const fd = new FormData();
    fd.append("title", editEvent.title);
    fd.append("description", editEvent.description);
    fd.append("date", editEvent.date);
    fd.append("time", editEvent.time);
    if (editEventImage) fd.append("image", await compressImage(editEventImage));
    const res = await fetch(`/api/admin/events/${eventId}`, { method: "PATCH", body: fd });
    const data = await res.json().catch(() => ({}));
    setEditEventSaving(false);
    if (!res.ok) { setEventMsg(data.error ?? "Update failed."); return; }
    setAdminEvents((evs) => evs.map((x) => x.id === eventId ? data.event : x).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setEditingEventId(null);
    setEventMsg("Event updated successfully.");
  }

  // ── shop products ──────────────────────────────────────────────────────────
  async function handleCreateProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProductSaving(true); setProductMsg("");
    const fd = new FormData();
    fd.append("name", newProduct.name);
    fd.append("category", newProduct.category);
    fd.append("priceRands", newProduct.priceRands);
    fd.append("description", newProduct.description);
    if (newProduct.badge) fd.append("badge", newProduct.badge);
    if (newProduct.emoji) fd.append("emoji", newProduct.emoji);
    fd.append("tileColor", CATEGORY_TILE[newProduct.category] ?? "#f7daff");
    if (newProduct.stock) fd.append("stock", newProduct.stock);
    if (newProductImage) fd.append("image", await compressImage(newProductImage));
    const res = await fetch("/api/admin/products", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setProductSaving(false);
    if (!res.ok) { setProductMsg(data.error ?? "Failed to create product."); return; }
    setProducts((ps) => [...ps, data.product].sort((a, b) => a.sort - b.sort));
    setNewProduct(emptyProductForm);
    setNewProductImage(null);
    setProductMsg("Product added successfully.");
  }

  function handleStartEditProduct(p: Product) {
    setEditingProductId(p.id);
    setEditProduct({
      name: p.name,
      category: (SHOP_CATEGORIES.includes(p.category as ShopCategory) ? p.category : "Treats") as ShopCategory,
      priceRands: String(p.priceCents / 100),
      description: p.description,
      badge: p.badge ?? "",
      emoji: p.emoji,
      stock: p.stock != null ? String(p.stock) : "",
      active: p.active,
    });
    setEditProductImage(null);
    setProductMsg("");
  }

  async function handleSaveEditProduct(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setEditProductSaving(true); setProductMsg("");
    const fd = new FormData();
    fd.append("name", editProduct.name);
    fd.append("category", editProduct.category);
    fd.append("priceRands", editProduct.priceRands);
    fd.append("description", editProduct.description);
    fd.append("badge", editProduct.badge);
    if (editProduct.emoji) fd.append("emoji", editProduct.emoji);
    fd.append("tileColor", CATEGORY_TILE[editProduct.category] ?? "#f7daff");
    fd.append("stock", editProduct.stock);
    fd.append("active", editProduct.active ? "true" : "false");
    if (editProductImage) fd.append("image", await compressImage(editProductImage));
    const res = await fetch(`/api/admin/products/${id}`, { method: "PATCH", body: fd });
    const data = await res.json().catch(() => ({}));
    setEditProductSaving(false);
    if (!res.ok) { setProductMsg(data.error ?? "Update failed."); return; }
    setProducts((ps) => ps.map((x) => x.id === id ? data.product : x).sort((a, b) => a.sort - b.sort));
    setEditingProductId(null);
    setProductMsg("Product updated successfully.");
  }

  async function handleToggleProductActive(p: Product) {
    setTogglingProductId(p.id);
    const fd = new FormData();
    fd.append("active", p.active ? "false" : "true");
    const res = await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", body: fd });
    const data = await res.json().catch(() => ({}));
    setTogglingProductId(null);
    if (!res.ok) { setProductMsg(data.error ?? "Update failed."); return; }
    setProducts((ps) => ps.map((x) => x.id === p.id ? data.product : x));
  }

  async function handleDeleteProduct(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeletingProductId(p.id);
    const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeletingProductId(null);
    if (!res.ok) { setProductMsg(data.error ?? "Delete failed."); return; }
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
  }

  async function handleUploadShopHero(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!shopHeroFile) { setShopHeroMsg("Choose an image first."); return; }
    setShopHeroSaving(true); setShopHeroMsg("");
    const fd = new FormData();
    fd.append("image", await compressImage(shopHeroFile));
    const res = await fetch("/api/admin/shop-hero", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setShopHeroSaving(false);
    if (!res.ok) { setShopHeroMsg(data.error ?? "Upload failed."); return; }
    setShopHeroUrl(data.imageUrl);
    setShopHeroFile(null);
    setShopHeroMsg("Storefront hero image updated.");
  }

  async function handleRemoveShopHero() {
    if (!confirm("Remove the storefront hero image? The shop will show the default illustration.")) return;
    setShopHeroSaving(true); setShopHeroMsg("");
    const res = await fetch("/api/admin/shop-hero", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setShopHeroSaving(false);
    if (!res.ok) { setShopHeroMsg(data.error ?? "Remove failed."); return; }
    setShopHeroUrl(null);
    setShopHeroMsg("Reverted to the default illustration.");
  }

  // ── shop orders ────────────────────────────────────────────────────────────
  async function handleSetOrderStatus(o: Order, status: OrderStatus) {
    setBusyOrderId(o.id); setOrderMsg("");
    const res = await fetch(`/api/admin/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyOrderId(null);
    if (!res.ok) { setOrderMsg(data.error ?? "Update failed."); return; }
    setOrders((os) => os.map((x) => x.id === o.id ? { ...x, status } : x));
  }

  async function handleDeleteVolunteer(v: VolunteerApplication) {
    if (!confirm(`Delete the application from ${v.fullName}? This cannot be undone.`)) return;
    setDeletingVolunteerId(v.id);
    const res = await fetch(`/api/admin/volunteers/${v.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setVolunteerMsg(data.error ?? "Delete failed."); setDeletingVolunteerId(null); return; }
    setVolunteers((vs) => vs.filter((x) => x.id !== v.id));
    if (expandedVolunteerId === v.id) setExpandedVolunteerId(null);
    setDeletingVolunteerId(null);
  }

  async function handleDeleteBooking(b: AdminBooking) {
    if (!confirm(`Cancel ${b.name}'s booking on ${b.date} at ${b.slot}? This frees up the slot.`)) return;
    setDeletingBookingId(b.id);
    const res = await fetch(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
    if (res.ok) setBookings((bs) => bs.filter((x) => x.id !== b.id));
    setDeletingBookingId(null);
  }

  async function patchBooking(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.booking) {
      setBookings((bs) => bs.map((x) => (x.id === id ? data.booking : x)));
      return true;
    }
    return false;
  }

  async function handleToggleArrived(b: AdminBooking) {
    setArrivingBookingId(b.id);
    await patchBooking(b.id, { arrived: !b.arrivedAt });
    setArrivingBookingId(null);
  }

  function handleStartEditBooking(b: AdminBooking) {
    setEditingBookingId(b.id);
    setBookingEditForm({
      name: b.name,
      phone: b.phone ?? "",
      partySize: String(b.partySize),
      actualPartySize: b.actualPartySize != null ? String(b.actualPartySize) : "",
    });
  }

  async function handleSaveBooking(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBookingEditSaving(true);
    const ok = await patchBooking(id, {
      name: bookingEditForm.name,
      phone: bookingEditForm.phone,
      partySize: bookingEditForm.partySize,
      actualPartySize: bookingEditForm.actualPartySize === "" ? null : bookingEditForm.actualPartySize,
    });
    setBookingEditSaving(false);
    if (ok) setEditingBookingId(null);
  }

  async function handleAddBooking(e: FormEvent<HTMLFormElement>, date: string) {
    e.preventDefault();
    setBookingAddSaving(true); setBookingAddMsg("");
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newBooking, date }),
    });
    const data = await res.json().catch(() => ({}));
    setBookingAddSaving(false);
    if (!res.ok) { setBookingAddMsg(data.error ?? "Could not add booking."); return; }
    setBookings((bs) => [...bs, data.booking]);
    setNewBooking({ slot: "", name: "", phone: "", email: "", partySize: "1" });
    setBookingAddMsg(data.offHours ? "Booked in (note: outside posted opening hours)." : "Booked in.");
  }

  async function handleCreateBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBlockSaving(true); setBlockMsg("");
    const res = await fetch("/api/admin/booking-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBlock),
    });
    const data = await res.json().catch(() => ({}));
    setBlockSaving(false);
    if (!res.ok) { setBlockMsg(data.error ?? "Could not save."); return; }
    setBlocks((bs) => [...bs, data.block].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)));
    setNewBlock({ date: "", startTime: "", endTime: "", title: "", price: "", notes: "" });
    setBlockMsg("Time blocked out successfully.");
  }

  async function handleDeleteBlock(b: AdminBlock) {
    if (!confirm(`Remove the block "${b.title}" on ${b.date}? This re-opens that time for public bookings.`)) return;
    setDeletingBlockId(b.id);
    const res = await fetch(`/api/admin/booking-blocks/${b.id}`, { method: "DELETE" });
    if (res.ok) setBlocks((bs) => bs.filter((x) => x.id !== b.id));
    setDeletingBlockId(null);
  }

  async function handleCreateMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemberSaving(true); setMemberMsg("");
    const res = await fetch("/api/admin/members", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMember),
    });
    const data = await res.json().catch(() => ({}));
    setMemberSaving(false);
    if (!res.ok) { setMemberMsg(data.error ?? "Could not add member."); return; }
    setMembers((m) => [data.member, ...m]);
    setNewMember({ name: "", email: "", phone: "", planId: "" });
    setMemberMsg("Member added.");
  }

  async function handleMemberAction(m: AdminMember, action: "activate" | "renew" | "cancel" | "pending", paidDate?: string) {
    setBusyMemberId(m.id);
    const body = action === "cancel" ? { status: "cancelled" }
      : action === "pending" ? { status: "pending" }
      : { action, paidDate };
    const res = await fetch(`/api/admin/members/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setMembers((ms) => ms.map((x) => x.id === m.id ? data.member : x)); setPayDates((p) => { const n = { ...p }; delete n[m.id]; return n; }); }
    else setMemberMsg(data.error ?? "Update failed.");
    setBusyMemberId(null);
  }

  async function handleDeleteMember(m: AdminMember) {
    if (!confirm(`Delete ${m.name}'s membership? This cannot be undone.`)) return;
    setBusyMemberId(m.id);
    const res = await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
    if (res.ok) setMembers((ms) => ms.filter((x) => x.id !== m.id));
    setBusyMemberId(null);
  }

  async function handleCreatePlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPlanSaving(true); setMemberMsg("");
    const res = await fetch("/api/admin/membership-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPlan) });
    const data = await res.json().catch(() => ({}));
    setPlanSaving(false);
    if (!res.ok) { setMemberMsg(data.error ?? "Could not add plan."); return; }
    setMemberPlans((p) => [...p, data.plan]);
    setNewPlan({ name: "", price: "", periodMonths: "1", description: "" });
  }

  async function handleTogglePlan(p: AdminPlan) {
    const res = await fetch(`/api/admin/membership-plans/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setMemberPlans((ps) => ps.map((x) => x.id === p.id ? data.plan : x));
  }

  async function handleDeletePlan(p: AdminPlan) {
    if (!confirm(`Delete the "${p.name}" plan?`)) return;
    const res = await fetch(`/api/admin/membership-plans/${p.id}`, { method: "DELETE" });
    if (res.ok) setMemberPlans((ps) => ps.filter((x) => x.id !== p.id));
  }

  function handleStartEditUser(user: AdminUser) {
    setEditingUserId(user.id);
    setEditUserForm({ email: user.email, password: "" });
    setUserMsg("");
  }

  async function handleSaveEditUser(e: FormEvent<HTMLFormElement>, userId: string) {
    e.preventDefault();
    setEditUserSaving(true); setUserMsg("");
    const body: Record<string, string> = {};
    const orig = adminUsers.find((u) => u.id === userId);
    if (editUserForm.email !== orig?.email) body.email = editUserForm.email;
    if (editUserForm.password) body.password = editUserForm.password;
    if (Object.keys(body).length === 0) { setEditingUserId(null); setEditUserSaving(false); return; }
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setEditUserSaving(false);
    if (!res.ok) { setUserMsg(data.error ?? "Update failed."); return; }
    setAdminUsers((u) => u.map((x) => x.id === userId ? data.user : x));
    setEditingUserId(null);
    setUserMsg("User updated successfully.");
  }

  async function handleUploadHelpPoster(slot: string, file: File, kind: "poster" | "image" = "poster") {
    setPosterUploadingSlot(`${slot}-${kind}`); setSettingsMsg("");
    const fd = new FormData();
    fd.append("slot", slot);
    fd.append("kind", kind);
    fd.append("image", await compressImage(file));
    const res = await fetch("/api/admin/help-poster", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setPosterUploadingSlot(null);
    if (!res.ok) { setSettingsMsg(data.error ?? "Upload failed."); return; }
    const key = kind === "image" ? imageUrlKey(slot) : posterUrlKey(slot);
    setSettings((s) => ({ ...s, [key]: data.url } as SiteSettings));
    setSettingsMsg("Updated.");
  }

  async function handleRemoveHelpPoster(slot: string, kind: "poster" | "image" = "poster") {
    if (!confirm("Remove this image?")) return;
    const res = await fetch(`/api/admin/help-poster?slot=${slot}&kind=${kind}`, { method: "DELETE" });
    if (res.ok) {
      const key = kind === "image" ? imageUrlKey(slot) : posterUrlKey(slot);
      setSettings((s) => ({ ...s, [key]: "" } as SiteSettings));
    }
  }

  async function handleSaveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsSaving(true); setSettingsMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, opening_hours: JSON.stringify(hoursWeek) }),
    });
    const data = await res.json().catch(() => ({}));
    setSettingsSaving(false);
    if (!res.ok) { setSettingsMsg(data.error ?? "Save failed."); return; }
    setSettingsMsg("Settings saved successfully.");
  }

  // --- opening hours editor helpers ---
  function patchDay(idx: number, fn: (d: DayHours) => DayHours) {
    setHoursWeek((w) => w.map((d, i) => (i === idx ? fn(d) : d)));
  }
  function toggleDayClosed(idx: number, closed: boolean) {
    patchDay(idx, (d) => ({
      ...d,
      closed,
      ranges: closed ? [] : d.ranges.length ? d.ranges : [{ start: "09:00", end: "17:00" }],
    }));
  }
  function addRange(idx: number) {
    patchDay(idx, (d) => ({ ...d, ranges: [...d.ranges, { start: "09:00", end: "17:00" }] }));
  }
  function removeRange(idx: number, ri: number) {
    patchDay(idx, (d) => ({ ...d, ranges: d.ranges.filter((_, j) => j !== ri) }));
  }
  function setRange(idx: number, ri: number, patch: Partial<TimeRange>) {
    patchDay(idx, (d) => ({ ...d, ranges: d.ranges.map((r, j) => (j === ri ? { ...r, ...patch } : r)) }));
  }
  function setDayNote(idx: number, note: string) {
    patchDay(idx, (d) => ({ ...d, note: note.trim() ? note : undefined }));
  }

  const groupedCats = {
    resident: cats.filter((c) => c.category === "resident"),
    adoptable: cats.filter((c) => c.category === "adoptable"),
    dual: cats.filter((c) => c.category === "dual"),
    tlc: cats.filter((c) => c.category === "tlc"),
  };

  // ── nav items ─────────────────────────────────────────────────────────────

  const NAV: { id: AdminTab; label: string; icon: string; area: string | null }[] = [
    { id: "cats", label: "Cats", icon: "🐾", area: "cats" },
    { id: "menu-images", label: "Hero & Menu Photos", icon: "📸", area: null },
    { id: "products", label: "Shop Products", icon: "🛍️", area: "products" },
    { id: "orders", label: "Shop Orders", icon: "🧾", area: "orders" },
    { id: "events", label: "Events", icon: "🎉", area: "events" },
    { id: "bookings", label: "Bookings", icon: "📅", area: "bookings" },
    { id: "members", label: "Members", icon: "🎟️", area: "members" },
    { id: "volunteers", label: "Volunteers", icon: "🙌", area: "volunteers" },
    { id: "settings", label: "Site Settings", icon: "⚙️", area: null },
    { id: "users", label: "Users", icon: "👤", area: null },
  ];

  const isVolunteer = auth.user?.role === "volunteer";
  const volPerms = settings.volunteer_permissions.split(",").map((s) => s.trim()).filter(Boolean);
  const visibleNav = NAV.filter((item) => (isVolunteer ? !!item.area && volPerms.includes(item.area) : true));

  // Cents (ZAR) → "R55" / "R55.50".
  const money = (cents: number) => {
    const v = Math.round(cents) / 100;
    return Number.isInteger(v) ? `R${v}` : `R${v.toFixed(2)}`;
  };
  const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
    pending: { bg: "#fff7ed", fg: "#b45309" },
    paid: { bg: "#f0fdf4", fg: "#15803d" },
    fulfilled: { bg: "#eff6ff", fg: "#1d4ed8" },
    cancelled: { bg: "#fef2f2", fg: "#b91c1c" },
  };

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
          .login-brand { flex: 1; background: ${SIDEBAR_BG}; display: flex; flex-direction: column; justify-content: space-between; padding: clamp(32px, 6vw, 64px); position: relative; overflow: hidden; }
          .login-form-panel { width: clamp(340px, 42vw, 520px); background: ${BRAND.cream}; display: flex; align-items: center; justify-content: center; padding: clamp(32px, 5vw, 64px); }
          @media (max-width: 640px) {
            .login-brand { display: none !important; }
            .login-form-panel { width: 100% !important; min-height: 100vh; align-items: flex-start; padding: 48px 24px 32px; }
          }
        `}</style>

        {/* ── Left: Branding panel ── */}
        <div className="login-brand">
          <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: "rgba(155,142,196,0.12)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(240,216,74,0.07)", pointerEvents: "none" }} />

          <div>
            <Link href="/" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 700, letterSpacing: 0.3, marginBottom: 48, transition: "color 0.2s" }}
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
            {[["🐾","Cat profiles","Add, remove & categorise cats"],["📸","Menu photos","Upload & manage menu images"],["🔒","Secure access","Approved admins only"]].map(([icon, title, sub], i, arr) => (
              <div key={title} className="login-info-pill" style={{ marginBottom: i === arr.length - 1 ? 0 : 14 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>{title}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Login form ── */}
        <div className="login-form-panel">
          <div style={{ width: "100%", maxWidth: 380 }}>
            {/* mobile-only back link */}
            <Link href="/" style={{ display: "none", fontSize: 13, color: BRAND.textLight, textDecoration: "none", fontWeight: 700, marginBottom: 32 }}
              className="mobile-back-link">
              ← Back to site
            </Link>
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
        .admin-sidebar { width: 220px; background: ${SIDEBAR_BG}; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.25s ease; }
        .admin-main { margin-left: 220px; flex: 1; background: #f4f0e8; min-height: 100vh; padding: clamp(24px, 4vw, 40px); }
        .admin-topbar { display: none; }
        .sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.3); }
          .admin-main { margin-left: 0 !important; padding: 16px; padding-top: 72px; }
          .admin-topbar { display: flex; align-items: center; justify-content: space-between; position: fixed; top: 0; left: 0; right: 0; height: 56px; background: ${SIDEBAR_BG}; z-index: 40; padding: 0 16px; }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 45; }
          .panel { padding: 18px; }
          .tab-grid { grid-template-columns: 1fr !important; }
          .settings-grid { grid-template-columns: 1fr !important; }
          .sticky-form { position: static !important; }
        }
      `}</style>

      {/* ── Mobile top bar ── */}
      <div className="admin-topbar">
        <div style={{ fontWeight: 900, fontSize: 16, color: "white" }}>MeanKat Admin</div>
        <button onClick={() => setMobileNavOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {[0,1,2].map((i) => <span key={i} style={{ display: "block", width: 22, height: 2, background: "white", borderRadius: 2 }} />)}
        </button>
      </div>

      {/* ── Sidebar overlay (mobile) ── */}
      {mobileNavOpen && <div className="sidebar-overlay" onClick={() => setMobileNavOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar${mobileNavOpen ? " open" : ""}`}>
        <div style={{ padding: "28px 20px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Admin</div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "white", lineHeight: 1.2 }}>MeanKat<br />Content</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px" }}>
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
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
      <main className="admin-main">

        {/* ── Cats Tab ── */}
        {activeTab === "cats" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Cats</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Cat Management</h1>
            </div>

            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Upload form */}
              <div className="panel sticky-form" style={{ position: "sticky", top: 20 }}>
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
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Nickname (optional)</div>
                    <input className="mk-input" value={upload.tagline} onChange={(e) => setUpload((c) => ({ ...c, tagline: e.target.value }))} placeholder="The Gentle Giant" />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Description</div>
                    <textarea className="mk-input" value={upload.description} onChange={(e) => setUpload((c) => ({ ...c, description: e.target.value }))} placeholder="A few lines about the cat's personality..." required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Where to find me (optional)</div>
                    <textarea className="mk-input" value={upload.whereToFind} onChange={(e) => setUpload((c) => ({ ...c, whereToFind: e.target.value }))} placeholder="Downstairs near reception…" style={{ minHeight: 60 }} />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>How to make me happy (optional)</div>
                    <textarea className="mk-input" value={upload.howToMakeHappy} onChange={(e) => setUpload((c) => ({ ...c, howToMakeHappy: e.target.value }))} placeholder="Gently pet my head and stay calm…" style={{ minHeight: 60 }} />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>How to help (optional)</div>
                    <textarea className="mk-input" value={upload.howToHelp} onChange={(e) => setUpload((c) => ({ ...c, howToHelp: e.target.value }))} placeholder="Any donation helps toward medical care…" style={{ minHeight: 60 }} />
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
                            <div key={cat.id} style={{ border: cat.hidden ? `1.5px dashed ${BRAND.purple}` : `1.5px solid ${BRAND.purpleLight}`, borderRadius: 12, overflow: "hidden", background: cat.hidden ? `${BRAND.purple}0c` : BRAND.white }}>
                              {cat.images?.[0] && (
                                <div style={{ position: "relative", width: "100%", height: 120, overflow: "hidden", display: "block", background: BRAND.purpleLight }}>
                                  <img src={cat.images[0]} alt={cat.name} style={{ ...transformToStyle(cat.imageTransforms?.[0]), opacity: cat.hidden ? 0.5 : 1 }} />
                                  {cat.hidden && (
                                    <div style={{ position: "absolute", top: 8, left: 8, background: BRAND.purpleDark, color: "white", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "3px 8px", borderRadius: 999 }}>🚫 Hidden</div>
                                  )}
                                </div>
                              )}
                              <div style={{ padding: 12 }}>
                                {editingCatId === cat.id ? (
                                  <form onSubmit={(e) => handleSaveCatFields(e, cat.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                                    <input className="mk-input" value={catEditForm.name} onChange={(e) => setCatEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" required />
                                    <select className="mk-input" value={catEditForm.category} onChange={(e) => setCatEditForm((f) => ({ ...f, category: e.target.value as CatCategory }))}>
                                      {CAT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <input className="mk-input" value={catEditForm.tagline} onChange={(e) => setCatEditForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Nickname (e.g. The Gentle Giant)" />
                                    <textarea className="mk-input" value={catEditForm.description} onChange={(e) => setCatEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" required style={{ minHeight: 70 }} />
                                    <textarea className="mk-input" value={catEditForm.whereToFind} onChange={(e) => setCatEditForm((f) => ({ ...f, whereToFind: e.target.value }))} placeholder="Where to find me" style={{ minHeight: 50 }} />
                                    <textarea className="mk-input" value={catEditForm.howToMakeHappy} onChange={(e) => setCatEditForm((f) => ({ ...f, howToMakeHappy: e.target.value }))} placeholder="How to make me happy" style={{ minHeight: 50 }} />
                                    <textarea className="mk-input" value={catEditForm.howToHelp} onChange={(e) => setCatEditForm((f) => ({ ...f, howToHelp: e.target.value }))} placeholder="How to help" style={{ minHeight: 50 }} />
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button className="mk-primary" type="submit" disabled={catEditSaving} style={{ flex: 1 }}>{catEditSaving ? "Saving…" : "Save"}</button>
                                      <button className="mk-outline" type="button" onClick={() => setEditingCatId(null)} style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{cat.name}</div>
                                    {cat.tagline && <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.purple, marginBottom: 4 }}>{cat.tagline}</div>}
                                    <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 10, maxHeight: 40, overflow: "hidden" }}>{cat.description}</div>
                                  </>
                                )}

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
                                              <div style={{ width: 52, height: 52, borderRadius: 7, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}` }}>
                                                <img src={url} alt="after" style={transformToStyle(cat.imageTransforms?.[i])} />
                                              </div>
                                              <button onClick={() => openCrop(cat, "after", i)} title="Adjust crop & zoom"
                                                style={{ position: "absolute", bottom: -5, left: -5, width: 18, height: 18, borderRadius: "50%", background: BRAND.purpleDark, border: "none", color: "white", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>⤢</button>
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
                                              <div style={{ width: 52, height: 52, borderRadius: 7, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}` }}>
                                                <img src={url} alt="before" style={transformToStyle(cat.beforeImageTransforms?.[i])} />
                                              </div>
                                              <button onClick={() => openCrop(cat, "before", i)} title="Adjust crop & zoom"
                                                style={{ position: "absolute", bottom: -5, left: -5, width: 18, height: 18, borderRadius: "50%", background: BRAND.purpleDark, border: "none", color: "white", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>⤢</button>
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

                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleStartEditCat(cat)}>Edit details</button>
                                  <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleToggleHiddenCat(cat)} title={cat.hidden ? "Show on the public site" : "Hide from the public site (keeps the profile)"}>
                                    {cat.hidden ? "👁 Show" : "🙈 Hide"}
                                  </button>
                                  <button className="mk-danger" onClick={() => handleDeleteCat(cat)} disabled={deletingCatId === cat.id} style={{ marginLeft: "auto" }}>
                                    {deletingCatId === cat.id ? "Removing…" : "Remove"}
                                  </button>
                                </div>
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
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Hero &amp; Menu Photos</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>
                <strong>Home hero photos</strong> rotate in the carousel on the home page (add 2 or more for the arrows to appear). <strong>Menu photos</strong> show in the carousel on the Café page.
              </p>
            </div>

            {/* Café photos */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start", marginBottom: 28 }}>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>🏠 Upload Home Hero Photo</div>
                <form onSubmit={handleUploadCafeImage} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Photo for the home page hero</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setCafeImageFile(e.target.files?.[0] ?? null)} required />
                  </label>
                  {cafeImageMsg && <div style={{ fontSize: 13, color: BRAND.textLight }}>{cafeImageMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={cafeImageSaving}>{cafeImageSaving ? "Uploading…" : "Upload hero photo"}</button>
                </form>
              </div>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Home Hero Photos ({cafeImages.length})</div>
                {cafeImages.length === 0
                  ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No hero photos yet — the default shows until you add some. Add 2 or more to make it a rotating carousel.</div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                      {cafeImages.map((img) => (
                        <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white }}>
                          <img src={img.url} alt="Café" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
                            <button className="mk-danger" onClick={() => handleDeleteCafeImage(img)} disabled={deletingCafeImageId === img.id}>
                              {deletingCafeImageId === img.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>

            {/* Cat Hero Guide */}
            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start", marginBottom: 28 }}>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>🦸 Upload Cat Hero Guide</div>
                <form onSubmit={handleUploadCatHero} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Infographic image (add each page)</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setCatHeroFile(e.target.files?.[0] ?? null)} required />
                  </label>
                  {catHeroMsg && <div style={{ fontSize: 13, color: BRAND.textLight }}>{catHeroMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={catHeroSaving}>{catHeroSaving ? "Uploading…" : "Upload guide image"}</button>
                </form>
              </div>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>Cat Hero Guide ({catHeroImages.length})</div>
                <p style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 14 }}>Shown as a pop-up when visitors click “Cat Hero Guide” on the home page. Upload each page; visitors flip through with arrows.</p>
                {catHeroImages.length === 0
                  ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No guide images yet — the button links to the Cats page until you add some.</div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                      {catHeroImages.map((img) => (
                        <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white }}>
                          <img src={img.url} alt="Cat Hero Guide" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
                            <button className="mk-danger" onClick={() => handleDeleteCatHero(img)} disabled={deletingCatHeroId === img.id}>
                              {deletingCatHeroId === img.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>

            {/* Café rules */}
            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start", marginBottom: 28 }}>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>🐾 Upload Café Rules</div>
                <form onSubmit={handleUploadRule} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Café / cat rules image</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setRuleFile(e.target.files?.[0] ?? null)} required />
                  </label>
                  {ruleMsg && <div style={{ fontSize: 13, color: BRAND.textLight }}>{ruleMsg}</div>}
                  <button className="mk-primary" type="submit" disabled={ruleSaving}>{ruleSaving ? "Uploading…" : "Upload café rules"}</button>
                </form>
              </div>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>Café Rules ({ruleImages.length})</div>
                <p style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 14 }}>Shown in the right-hand carousel on the Café page, next to the menu.</p>
                {ruleImages.length === 0
                  ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No café rules images yet — the carousel shows “coming soon” until you add some.</div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                      {ruleImages.map((img) => (
                        <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white }}>
                          <img src={img.url} alt="Café rules" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
                            <button className="mk-danger" onClick={() => handleDeleteRule(img)} disabled={deletingRuleId === img.id}>
                              {deletingRuleId === img.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>

            {/* About + Homepage gallery carousels */}
            {([
              { sec: "about", title: "👩 About — Founder Photos", sub: "Carousel next to ‘How it all started’ on the About page." },
              { sec: "home2", title: "🐱 Homepage — ‘Second Chances’ Photos", sub: "Carousel in the ‘Coffee, Cats & Second Chances’ section on the home page." },
              { sec: "membership", title: "💳 Membership — Purrks Club Graphic", sub: "Shown at the top of the Membership page. Upload the Purrks Club plans graphic here." },
            ] as const).map(({ sec, title, sub }) => (
              <div key={sec} className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start", marginBottom: 28 }}>
                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>{title}</div>
                  <form onSubmit={(e) => handleUploadGallery(e, sec)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Add a photo</div>
                      <input className="mk-input" type="file" accept="image/*" onChange={(e) => setGalleryFile((f) => ({ ...f, [sec]: e.target.files?.[0] ?? null }))} required />
                    </label>
                    {galleryMsg && gallerySaving === null && <div style={{ fontSize: 13, color: BRAND.textLight }}>{galleryMsg}</div>}
                    <button className="mk-primary" type="submit" disabled={gallerySaving === sec}>{gallerySaving === sec ? "Uploading…" : "Upload photo"}</button>
                  </form>
                </div>
                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>Photos ({galleries[sec]?.length ?? 0})</div>
                  <p style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 14 }}>{sub} Add 2+ to make it rotate.</p>
                  {(galleries[sec]?.length ?? 0) === 0
                    ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No photos yet — the default image shows until you add some.</div>
                    : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
                        {(galleries[sec] ?? []).map((img) => (
                          <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white }}>
                            <img src={img.url} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
                            <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
                              <button className="mk-danger" onClick={() => handleDeleteGallery(sec, img)} disabled={deletingGalleryId === img.id}>
                                {deletingGalleryId === img.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            ))}

            {/* Menu photos */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>☕ Upload Menu Photo</div>
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

        {/* ── Events Tab ── */}
        {activeTab === "events" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Events</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Events</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Add and manage upcoming events shown on the public Events page.</p>
            </div>

            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Create form */}
              <div className="panel sticky-form" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Add New Event</div>
                <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Event title</div>
                    <input className="mk-input" value={newEvent.title} onChange={(e) => setNewEvent((v) => ({ ...v, title: e.target.value }))} placeholder="Cat Yoga Morning" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Date</div>
                    <input className="mk-input" type="date" value={newEvent.date} onChange={(e) => setNewEvent((v) => ({ ...v, date: e.target.value }))} required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Time (optional)</div>
                    <input className="mk-input" value={newEvent.time} onChange={(e) => setNewEvent((v) => ({ ...v, time: e.target.value }))} placeholder="7pm – 9pm" />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Description</div>
                    <textarea className="mk-input" value={newEvent.description} onChange={(e) => setNewEvent((v) => ({ ...v, description: e.target.value }))} placeholder="A few lines about the event…" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Banner image (optional)</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setNewEventImage(e.target.files?.[0] ?? null)} />
                  </label>
                  {eventMsg && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: eventMsg.includes("success") ? "#16a34a" : "#b42318", background: eventMsg.includes("success") ? "#f0fdf4" : "#fff0ee", border: `1px solid ${eventMsg.includes("success") ? "#bbf7d0" : "#f4c2be"}`, borderRadius: 8, padding: "10px 14px" }}>
                      {eventMsg}
                    </div>
                  )}
                  <button className="mk-primary" type="submit" disabled={eventSaving}>{eventSaving ? "Creating…" : "Create event"}</button>
                </form>
              </div>

              {/* Events list */}
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>All Events ({adminEvents.length})</div>
                {adminEvents.length === 0 ? (
                  <div style={{ color: BRAND.textLight, fontSize: 14 }}>No events yet. Create one to get started.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {adminEvents.map((ev) => {
                      const d = new Date(ev.date);
                      const isPast = d < new Date(new Date().toDateString());
                      if (editingEventId === ev.id) {
                        return (
                          <form key={ev.id} onSubmit={(e) => handleSaveEditEvent(e, ev.id)} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purple}`, background: BRAND.white, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.text }}>Edit event</div>
                            <input className="mk-input" value={editEvent.title} onChange={(e) => setEditEvent((v) => ({ ...v, title: e.target.value }))} placeholder="Event title" required />
                            <input className="mk-input" type="date" value={editEvent.date} onChange={(e) => setEditEvent((v) => ({ ...v, date: e.target.value }))} required />
                            <input className="mk-input" value={editEvent.time} onChange={(e) => setEditEvent((v) => ({ ...v, time: e.target.value }))} placeholder="Time (optional)" />
                            <textarea className="mk-input" value={editEvent.description} onChange={(e) => setEditEvent((v) => ({ ...v, description: e.target.value }))} placeholder="Description" required />
                            <label>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Replace banner (optional)</div>
                              <input className="mk-input" type="file" accept="image/*" onChange={(e) => setEditEventImage(e.target.files?.[0] ?? null)} />
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="mk-primary" type="submit" disabled={editEventSaving} style={{ flex: 1 }}>{editEventSaving ? "Saving…" : "Save changes"}</button>
                              <button className="mk-outline" type="button" onClick={() => setEditingEventId(null)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                          </form>
                        );
                      }
                      return (
                        <div key={ev.id} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, overflow: "hidden", opacity: isPast ? 0.75 : 1 }}>
                          {ev.imageUrl && (
                            <img src={ev.imageUrl} alt={ev.title} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                          )}
                          <div style={{ padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <div style={{ textAlign: "center", minWidth: 46, background: isPast ? "#f0f0f0" : `${BRAND.yellow}33`, border: `2px solid ${isPast ? "#ddd" : BRAND.yellow}`, borderRadius: 10, padding: "8px 4px", flexShrink: 0 }}>
                              <div style={{ fontWeight: 900, fontSize: 18, color: BRAND.text, lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: BRAND.purple, letterSpacing: 1.5, marginTop: 2 }}>{d.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase()}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text }}>{ev.title}</div>
                                {isPast && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f0f0f0", color: "#999" }}>Past</span>}
                              </div>
                              {ev.time && <div style={{ fontSize: 12, color: BRAND.purple, fontWeight: 700, marginTop: 2 }}>🕐 {ev.time}</div>}
                              <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 4, lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{ev.description}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                              <button className="mk-outline" onClick={() => handleStartEditEvent(ev)} style={{ padding: "6px 12px", fontSize: 12 }}>Edit</button>
                              <button className="mk-danger" onClick={() => handleDeleteEvent(ev)} disabled={deletingEventId === ev.id}>
                                {deletingEventId === ev.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Products Tab ── */}
        {activeTab === "products" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Shop</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Shop Products</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Add and manage the products sold in the MeanKat Café online shop.</p>
            </div>

            {/* Storefront hero image ("Café Approved" card on the shop home page) */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: BRAND.text }}>Storefront hero image</div>
              <p style={{ color: BRAND.textLight, fontSize: 13, marginTop: 0, marginBottom: 14 }}>The “Café Approved” picture on the shop home page. Leave empty to show the default cat illustration.</p>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 130, height: 162, borderRadius: 16, border: `2px solid ${BRAND.purpleLight}`, background: "#efe2f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 60 }}>
                  {shopHeroUrl ? <img src={shopHeroUrl} alt="Storefront hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>🐈</span>}
                </div>
                <form onSubmit={handleUploadShopHero} style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 240 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>{shopHeroUrl ? "Replace image" : "Upload image"}</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setShopHeroFile(e.target.files?.[0] ?? null)} />
                  </label>
                  {shopHeroMsg && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: shopHeroMsg.includes("updated") || shopHeroMsg.includes("default") ? "#16a34a" : "#b42318" }}>{shopHeroMsg}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="mk-primary" type="submit" disabled={shopHeroSaving} style={{ width: "auto", padding: "10px 18px" }}>{shopHeroSaving ? "Saving…" : "Save image"}</button>
                    {shopHeroUrl && <button className="mk-danger" type="button" onClick={handleRemoveShopHero} disabled={shopHeroSaving}>Remove</button>}
                  </div>
                </form>
              </div>
            </div>

            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Create form */}
              <div className="panel sticky-form" style={{ position: "sticky", top: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Add New Product</div>
                <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Product name</div>
                    <input className="mk-input" value={newProduct.name} onChange={(e) => setNewProduct((v) => ({ ...v, name: e.target.value }))} placeholder="Salmon Crunch Treats" required />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Category</div>
                    <select className="mk-input" value={newProduct.category} onChange={(e) => setNewProduct((v) => ({ ...v, category: e.target.value as ShopCategory }))}>
                      {SHOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <label style={{ flex: 1 }}>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Price (R)</div>
                      <input className="mk-input" type="number" min="0" step="0.01" value={newProduct.priceRands} onChange={(e) => setNewProduct((v) => ({ ...v, priceRands: e.target.value }))} placeholder="55" required />
                    </label>
                    <label style={{ width: 96 }}>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Emoji</div>
                      <input className="mk-input" value={newProduct.emoji} onChange={(e) => setNewProduct((v) => ({ ...v, emoji: e.target.value }))} placeholder="🐟" />
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <label style={{ flex: 1 }}>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Badge (optional)</div>
                      <input className="mk-input" value={newProduct.badge} onChange={(e) => setNewProduct((v) => ({ ...v, badge: e.target.value }))} placeholder="Bestseller" />
                    </label>
                    <label style={{ width: 110 }}>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Stock (opt.)</div>
                      <input className="mk-input" type="number" min="0" value={newProduct.stock} onChange={(e) => setNewProduct((v) => ({ ...v, stock: e.target.value }))} placeholder="—" />
                    </label>
                  </div>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Description</div>
                    <textarea className="mk-input" value={newProduct.description} onChange={(e) => setNewProduct((v) => ({ ...v, description: e.target.value }))} placeholder="A few lines about the product…" />
                  </label>
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Product photo (optional)</div>
                    <input className="mk-input" type="file" accept="image/*" onChange={(e) => setNewProductImage(e.target.files?.[0] ?? null)} />
                  </label>
                  {productMsg && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: productMsg.includes("success") ? "#16a34a" : "#b42318", background: productMsg.includes("success") ? "#f0fdf4" : "#fff0ee", border: `1px solid ${productMsg.includes("success") ? "#bbf7d0" : "#f4c2be"}`, borderRadius: 8, padding: "10px 14px" }}>
                      {productMsg}
                    </div>
                  )}
                  <button className="mk-primary" type="submit" disabled={productSaving}>{productSaving ? "Adding…" : "Add product"}</button>
                </form>
              </div>

              {/* Products list */}
              <div className="panel">
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>All Products ({products.length})</div>
                {products.length === 0 ? (
                  <div style={{ color: BRAND.textLight, fontSize: 14 }}>No products yet. Add one to get started.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {products.map((p) => {
                      if (editingProductId === p.id) {
                        return (
                          <form key={p.id} onSubmit={(e) => handleSaveEditProduct(e, p.id)} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purple}`, background: BRAND.white, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.text }}>Edit product</div>
                            <input className="mk-input" value={editProduct.name} onChange={(e) => setEditProduct((v) => ({ ...v, name: e.target.value }))} placeholder="Product name" required />
                            <div style={{ display: "flex", gap: 8 }}>
                              <select className="mk-input" value={editProduct.category} onChange={(e) => setEditProduct((v) => ({ ...v, category: e.target.value as ShopCategory }))} style={{ flex: 1 }}>
                                {SHOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input className="mk-input" type="number" min="0" step="0.01" value={editProduct.priceRands} onChange={(e) => setEditProduct((v) => ({ ...v, priceRands: e.target.value }))} placeholder="Price" style={{ width: 100 }} required />
                              <input className="mk-input" value={editProduct.emoji} onChange={(e) => setEditProduct((v) => ({ ...v, emoji: e.target.value }))} placeholder="🐟" style={{ width: 70 }} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input className="mk-input" value={editProduct.badge} onChange={(e) => setEditProduct((v) => ({ ...v, badge: e.target.value }))} placeholder="Badge (optional)" style={{ flex: 1 }} />
                              <input className="mk-input" type="number" min="0" value={editProduct.stock} onChange={(e) => setEditProduct((v) => ({ ...v, stock: e.target.value }))} placeholder="Stock" style={{ width: 100 }} />
                            </div>
                            <textarea className="mk-input" value={editProduct.description} onChange={(e) => setEditProduct((v) => ({ ...v, description: e.target.value }))} placeholder="Description" />
                            <label>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Replace photo (optional)</div>
                              <input className="mk-input" type="file" accept="image/*" onChange={(e) => setEditProductImage(e.target.files?.[0] ?? null)} />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: BRAND.text }}>
                              <input type="checkbox" checked={editProduct.active} onChange={(e) => setEditProduct((v) => ({ ...v, active: e.target.checked }))} />
                              Visible in shop
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="mk-primary" type="submit" disabled={editProductSaving} style={{ flex: 1 }}>{editProductSaving ? "Saving…" : "Save changes"}</button>
                              <button className="mk-outline" type="button" onClick={() => setEditingProductId(null)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                          </form>
                        );
                      }
                      return (
                        <div key={p.id} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", opacity: p.active ? 1 : 0.6 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 10, background: p.tileColor || "#f7daff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 26 }}>
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{p.emoji}</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text }}>{p.name}</div>
                              {p.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${BRAND.yellow}44`, color: BRAND.text }}>{p.badge}</span>}
                              {!p.active && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f0f0f0", color: "#999" }}>Hidden</span>}
                            </div>
                            <div style={{ fontSize: 12, color: BRAND.purple, fontWeight: 700, marginTop: 2 }}>{p.category} · {money(p.priceCents)}{p.stock != null ? ` · ${p.stock} in stock` : ""}</div>
                            {p.description && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                            <button className="mk-outline" onClick={() => handleStartEditProduct(p)} style={{ padding: "6px 12px", fontSize: 12 }}>Edit</button>
                            <button className="mk-outline" onClick={() => handleToggleProductActive(p)} disabled={togglingProductId === p.id} style={{ padding: "6px 12px", fontSize: 12 }}>{togglingProductId === p.id ? "…" : p.active ? "Hide" : "Show"}</button>
                            <button className="mk-danger" onClick={() => handleDeleteProduct(p)} disabled={deletingProductId === p.id}>{deletingProductId === p.id ? "Deleting…" : "Delete"}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Shop</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Shop Orders</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Orders placed through the online shop. Mark them fulfilled once shipped or collected.</p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {(["all", "pending", "paid", "fulfilled", "cancelled"] as const).map((f) => (
                <button key={f} onClick={() => setOrderFilter(f)} className={orderFilter === f ? "mk-primary" : "mk-outline"} style={{ padding: "6px 14px", fontSize: 12, textTransform: "capitalize" }}>
                  {f}{f !== "all" ? ` (${orders.filter((o) => o.status === f).length})` : ` (${orders.length})`}
                </button>
              ))}
            </div>
            {orderMsg && <div style={{ fontSize: 13, fontWeight: 700, color: "#b42318", marginBottom: 12 }}>{orderMsg}</div>}

            <div className="panel">
              {(() => {
                const shown = orders.filter((o) => orderFilter === "all" || o.status === orderFilter);
                if (shown.length === 0) return <div style={{ color: BRAND.textLight, fontSize: 14 }}>No orders{orderFilter === "all" ? " yet" : ` with status “${orderFilter}”`}.</div>;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {shown.map((o) => {
                      const c = ORDER_STATUS_COLORS[o.status];
                      const expanded = expandedOrderId === o.id;
                      return (
                        <div key={o.id} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, overflow: "hidden" }}>
                          <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setExpandedOrderId(expanded ? null : o.id)}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 800, fontSize: 14, color: BRAND.text, fontFamily: "'Courier Prime', monospace" }}>#{o.reference}</span>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: 0.5 }}>{o.status}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f4f2fb", color: BRAND.purple }}>{o.fulfilment === "ship" ? "🚚 Ship" : "🏬 Pickup"}</span>
                              </div>
                              <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 3 }}>{o.firstName} {o.lastName} · {o.email} · {new Date(o.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</div>
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 16, color: BRAND.text }}>{money(o.totalCents)}</div>
                          </div>
                          {expanded && (
                            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BRAND.purpleLight}55` }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
                                {o.items.map((it) => (
                                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: BRAND.text }}>
                                    <span>{it.emoji ? `${it.emoji} ` : ""}{it.name} ×{it.qty}</span>
                                    <span style={{ fontWeight: 700 }}>{money(it.unitPriceCents * it.qty)}</span>
                                  </div>
                                ))}
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BRAND.textLight, borderTop: `1px solid ${BRAND.purpleLight}55`, paddingTop: 6 }}>
                                  <span>Subtotal</span><span>{money(o.subtotalCents)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BRAND.textLight }}>
                                  <span>{o.fulfilment === "ship" ? "Shipping" : "Pickup"}</span><span>{o.shippingCents ? money(o.shippingCents) : "Free"}</span>
                                </div>
                              </div>
                              {o.address && (
                                <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 10 }}>📍 {o.address.street}, {o.address.city}, {o.address.postalCode}</div>
                              )}
                              <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 12 }}>📞 {o.phone}</div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {o.status !== "fulfilled" && <button className="mk-primary" style={{ padding: "7px 14px", fontSize: 12 }} disabled={busyOrderId === o.id} onClick={() => handleSetOrderStatus(o, "fulfilled")}>Mark fulfilled</button>}
                                {o.status !== "paid" && o.status !== "fulfilled" && <button className="mk-outline" style={{ padding: "7px 14px", fontSize: 12 }} disabled={busyOrderId === o.id} onClick={() => handleSetOrderStatus(o, "paid")}>Mark paid</button>}
                                {o.status !== "cancelled" && <button className="mk-danger" style={{ padding: "7px 14px", fontSize: 12 }} disabled={busyOrderId === o.id} onClick={() => handleSetOrderStatus(o, "cancelled")}>Cancel</button>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* ── Bookings Tab ── */}
        {activeTab === "bookings" && (() => {
          const [yy, mm] = bookingMonth.split("-").map(Number);
          const firstWeekday = new Date(Date.UTC(yy, mm - 1, 1)).getUTCDay();
          const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
          const byDate = new Map<string, AdminBooking[]>();
          for (const b of bookings) {
            const list = byDate.get(b.date) ?? [];
            list.push(b);
            byDate.set(b.date, list);
          }
          const monthLabel = new Date(Date.UTC(yy, mm - 1, 1)).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
          const shiftMonth = (delta: number) => {
            const d = new Date(Date.UTC(yy, mm - 1 + delta, 1));
            setBookingMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
            setSelectedBookingDate(null);
          };
          const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${bookingMonth}-${String(i + 1).padStart(2, "0")}`)];
          const todayStr = new Date().toISOString().slice(0, 10);
          const selectedList = selectedBookingDate ? (byDate.get(selectedBookingDate) ?? []).slice().sort((a, b) => a.slot.localeCompare(b.slot)) : [];
          return (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Calendar</div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Bookings</h1>
                <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Visit reservations from the public site. Click a day to see and manage its bookings. The per-hour limit is set in Site Settings.</p>
              </div>

              <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
                <div className="panel">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <button className="mk-outline" style={{ padding: "6px 12px" }} onClick={() => shiftMonth(-1)}>‹</button>
                    <div style={{ fontWeight: 800, fontSize: 16, color: BRAND.text }}>{monthLabel}</div>
                    <button className="mk-outline" style={{ padding: "6px 12px" }} onClick={() => shiftMonth(1)}>›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: BRAND.textLight, letterSpacing: 1, padding: "4px 0" }}>{d.toUpperCase()}</div>
                    ))}
                    {cells.map((dateStr, i) => {
                      if (!dateStr) return <div key={`b${i}`} />;
                      const count = (byDate.get(dateStr) ?? []).length;
                      const day = Number(dateStr.slice(-2));
                      const isSel = selectedBookingDate === dateStr;
                      const isToday = dateStr === todayStr;
                      return (
                        <button key={dateStr} onClick={() => setSelectedBookingDate(dateStr)}
                          style={{ aspectRatio: "1", borderRadius: 10, border: isSel ? `2px solid ${BRAND.purpleDark}` : isToday ? `2px solid ${BRAND.yellow}` : `1.5px solid ${BRAND.purpleLight}`, background: count ? `${BRAND.purple}1a` : BRAND.white, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.text }}>{day}</span>
                          {count > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: "white", background: BRAND.purpleDark, borderRadius: 999, padding: "1px 6px" }}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, color: BRAND.text }}>
                    {selectedBookingDate ? new Date(`${selectedBookingDate}T00:00:00Z`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "Select a day"}
                  </div>
                  {!selectedBookingDate ? (
                    <div style={{ color: BRAND.textLight, fontSize: 14 }}>Pick a day on the calendar to see and manage its bookings.</div>
                  ) : (
                    <>
                      {selectedList.length === 0 ? (
                        <div style={{ color: BRAND.textLight, fontSize: 14, marginBottom: 18 }}>No bookings for this day yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                          {selectedList.map((b) => {
                            const arrived = !!b.arrivedAt;
                            const present = b.actualPartySize != null ? b.actualPartySize : b.partySize;
                            const isEditing = editingBookingId === b.id;
                            return (
                              <div key={b.id} style={{ border: `1.5px solid ${arrived ? "#bbf7d0" : BRAND.purpleLight}`, borderRadius: 10, padding: "10px 12px", background: arrived ? "#f0fdf4" : BRAND.white, opacity: arrived ? 0.78 : 1 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                  <div style={{ textAlign: "center", minWidth: 52, background: `${BRAND.yellow}33`, border: `2px solid ${BRAND.yellow}`, borderRadius: 8, padding: "6px 4px", flexShrink: 0 }}>
                                    <div style={{ fontWeight: 900, fontSize: 13, color: BRAND.text }}>{b.slot}</div>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text, textDecoration: arrived ? "line-through" : "none" }}>
                                      {b.name} · {present} {present === 1 ? "guest" : "guests"}
                                      {b.actualPartySize != null && b.actualPartySize !== b.partySize && (
                                        <span style={{ fontWeight: 600, color: BRAND.textLight }}> (booked {b.partySize})</span>
                                      )}
                                    </div>
                                    {(b.email || b.phone) && <div style={{ fontSize: 12, color: BRAND.textLight, wordBreak: "break-all" }}>{b.email}{b.email && b.phone ? " · " : ""}{b.phone}</div>}
                                    {arrived && (
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginTop: 3 }}>
                                        ✓ Arrived {fmtClock(b.arrivedAt!)} · hour up {plusHourClock(b.arrivedAt!)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isEditing ? (
                                  <form onSubmit={(e) => handleSaveBooking(e, b.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                                    <input className="mk-input" value={bookingEditForm.name} onChange={(e) => setBookingEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" required />
                                    <input className="mk-input" value={bookingEditForm.phone} onChange={(e) => setBookingEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" />
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <label style={{ flex: 1 }}>
                                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Booked</div>
                                        <input className="mk-input" type="number" min={1} value={bookingEditForm.partySize} onChange={(e) => setBookingEditForm((f) => ({ ...f, partySize: e.target.value }))} />
                                      </label>
                                      <label style={{ flex: 1 }}>
                                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Actually present</div>
                                        <input className="mk-input" type="number" min={0} value={bookingEditForm.actualPartySize} onChange={(e) => setBookingEditForm((f) => ({ ...f, actualPartySize: e.target.value }))} placeholder="—" />
                                      </label>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button className="mk-primary" type="submit" disabled={bookingEditSaving} style={{ flex: 1 }}>{bookingEditSaving ? "Saving…" : "Save"}</button>
                                      <button className="mk-outline" type="button" onClick={() => setEditingBookingId(null)} style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                  </form>
                                ) : (
                                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                                    <button type="button" className={arrived ? "mk-outline" : "mk-primary"} onClick={() => handleToggleArrived(b)} disabled={arrivingBookingId === b.id} style={{ fontSize: 12, padding: "6px 12px" }}>
                                      {arrivingBookingId === b.id ? "…" : arrived ? "Undo arrival" : "✓ Mark arrived"}
                                    </button>
                                    <button type="button" className="mk-outline" onClick={() => handleStartEditBooking(b)} style={{ fontSize: 12, padding: "6px 12px" }}>Edit / head count</button>
                                    <button type="button" className="mk-danger" onClick={() => handleDeleteBooking(b)} disabled={deletingBookingId === b.id} style={{ fontSize: 12, padding: "6px 12px", marginLeft: "auto" }}>
                                      {deletingBookingId === b.id ? "…" : "Cancel"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Manual booking (walk-ins / phone bookings) */}
                      <div style={{ borderTop: `1.5px dashed ${BRAND.purpleLight}`, paddingTop: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.purple, marginBottom: 10 }}>➕ Book someone in</div>
                        <form onSubmit={(e) => handleAddBooking(e, selectedBookingDate)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <label style={{ flex: 1 }}>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Time</div>
                              {(() => {
                                const daySlots = slotsForDate(hoursWeek, selectedBookingDate);
                                return daySlots.length > 0 ? (
                                  <select className="mk-input" value={newBooking.slot} onChange={(e) => setNewBooking((v) => ({ ...v, slot: e.target.value }))} required>
                                    <option value="">Pick…</option>
                                    {daySlots.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                ) : (
                                  <input className="mk-input" type="time" value={newBooking.slot} onChange={(e) => setNewBooking((v) => ({ ...v, slot: e.target.value }))} required />
                                );
                              })()}
                            </label>
                            <label style={{ width: 90 }}>
                              <div className="tag" style={{ color: BRAND.textLight, marginBottom: 4, fontSize: 10 }}>Guests</div>
                              <input className="mk-input" type="number" min={1} value={newBooking.partySize} onChange={(e) => setNewBooking((v) => ({ ...v, partySize: e.target.value }))} required />
                            </label>
                          </div>
                          <input className="mk-input" value={newBooking.name} onChange={(e) => setNewBooking((v) => ({ ...v, name: e.target.value }))} placeholder="Name" required />
                          <input className="mk-input" value={newBooking.phone} onChange={(e) => setNewBooking((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone (optional)" />
                          <input className="mk-input" type="email" value={newBooking.email} onChange={(e) => setNewBooking((v) => ({ ...v, email: e.target.value }))} placeholder="Email (optional)" />
                          {bookingAddMsg && <div style={{ fontSize: 12, fontWeight: 700, color: bookingAddMsg.startsWith("Booked") ? "#16a34a" : "#b42318" }}>{bookingAddMsg}</div>}
                          <button className="mk-primary" type="submit" disabled={bookingAddSaving}>{bookingAddSaving ? "Adding…" : "Add booking"}</button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Block out time / private events */}
              <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start", marginTop: 28 }}>
                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🚫 Block out time</div>
                  <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 16 }}>Reserve a time range for a private event. It&apos;s removed from public booking availability.</p>
                  <form onSubmit={handleCreateBlock} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Date</div>
                      <input className="mk-input" type="date" value={newBlock.date} onChange={(e) => setNewBlock((v) => ({ ...v, date: e.target.value }))} required />
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <label style={{ flex: 1 }}>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>From</div>
                        <input className="mk-input" type="time" value={newBlock.startTime} onChange={(e) => setNewBlock((v) => ({ ...v, startTime: e.target.value }))} required />
                      </label>
                      <label style={{ flex: 1 }}>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>To</div>
                        <input className="mk-input" type="time" value={newBlock.endTime} onChange={(e) => setNewBlock((v) => ({ ...v, endTime: e.target.value }))} required />
                      </label>
                    </div>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Event title</div>
                      <input className="mk-input" value={newBlock.title} onChange={(e) => setNewBlock((v) => ({ ...v, title: e.target.value }))} placeholder="Private party" required />
                    </label>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Price / amount (optional)</div>
                      <input className="mk-input" value={newBlock.price} onChange={(e) => setNewBlock((v) => ({ ...v, price: e.target.value }))} placeholder="R1500 / R150 pp" />
                    </label>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Notes (optional)</div>
                      <textarea className="mk-input" value={newBlock.notes} onChange={(e) => setNewBlock((v) => ({ ...v, notes: e.target.value }))} style={{ minHeight: 60, resize: "vertical" }} />
                    </label>
                    {blockMsg && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: blockMsg.includes("success") ? "#16a34a" : "#b42318", background: blockMsg.includes("success") ? "#f0fdf4" : "#fff0ee", border: `1px solid ${blockMsg.includes("success") ? "#bbf7d0" : "#f4c2be"}`, borderRadius: 8, padding: "10px 14px" }}>{blockMsg}</div>
                    )}
                    <button className="mk-primary" type="submit" disabled={blockSaving}>{blockSaving ? "Saving…" : "Block out this time"}</button>
                  </form>
                </div>

                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>Blocked Times ({blocks.length})</div>
                  {blocks.length === 0 ? (
                    <div style={{ color: BRAND.textLight, fontSize: 14 }}>No blocked times yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {blocks.map((b) => (
                        <div key={b.id} style={{ border: `1.5px solid ${BRAND.purpleLight}`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ textAlign: "center", minWidth: 96, background: "#fff0ee", border: "2px solid #f4c2be", borderRadius: 8, padding: "6px 4px", flexShrink: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: BRAND.text }}>{new Date(`${b.date}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" })}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#b42318" }}>{b.startTime}–{b.endTime}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text }}>{b.title}{b.price ? ` · ${b.price}` : ""}</div>
                            {b.notes && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 2 }}>{b.notes}</div>}
                          </div>
                          <button className="mk-danger" onClick={() => handleDeleteBlock(b)} disabled={deletingBlockId === b.id} style={{ flexShrink: 0 }}>
                            {deletingBlockId === b.id ? "…" : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── Members Tab ── */}
        {activeTab === "members" && (() => {
          const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
          const q = memberSearch.trim().toLowerCase();
          const filtered = members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.memberCode.toLowerCase().includes(q) || (m.phone ?? "").toLowerCase().includes(q));
          const isActive = (m: AdminMember) => m.status === "active" && !!m.validUntil && m.validUntil >= today;
          const activeCount = members.filter(isActive).length;
          const fmt = (d?: string | null) => d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
          return (
            <>
              <div style={{ marginBottom: 22 }}>
                <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Memberships</div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Members</h1>
                <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>{activeCount} active · {members.length} total. Search a name, email, phone or member code to verify at the door.</p>
              </div>

              <div className="panel" style={{ marginBottom: 20 }}>
                <input className="mk-input" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="🔎 Door check — search name, email, phone or code…" style={{ fontSize: 16 }} />
                {q && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.length === 0 ? <div style={{ color: BRAND.textLight, fontSize: 14 }}>No match.</div> : filtered.slice(0, 6).map((m) => {
                      const act = isActive(m);
                      return (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 12, border: `2px solid ${act ? "#16a34a" : "#e5b3b0"}`, background: act ? "#f0fdf4" : "#fff7f6" }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 16, color: BRAND.text }}>{m.name} <span style={{ fontFamily: "monospace", fontSize: 13, color: BRAND.purple }}>{m.memberCode}</span></div>
                            <div style={{ fontSize: 12, color: BRAND.textLight }}>{m.planName ?? "—"}{m.validUntil ? ` · until ${fmt(m.validUntil)}` : ""}</div>
                          </div>
                          <span style={{ fontWeight: 900, fontSize: 14, padding: "6px 14px", borderRadius: 999, background: act ? "#16a34a" : "#b42318", color: "white" }}>{act ? "ACTIVE" : (m.status === "pending" ? "PENDING" : "NOT ACTIVE")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {memberMsg && (
                <div style={{ fontSize: 13, fontWeight: 700, color: memberMsg.includes("added") ? "#16a34a" : "#b42318", background: memberMsg.includes("added") ? "#f0fdf4" : "#fff0ee", border: `1px solid ${memberMsg.includes("added") ? "#bbf7d0" : "#f4c2be"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>{memberMsg}</div>
              )}

              <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: BRAND.text }}>Add Member</div>
                    <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <input className="mk-input" value={newMember.name} onChange={(e) => setNewMember((v) => ({ ...v, name: e.target.value }))} placeholder="Full name" required />
                      <input className="mk-input" type="email" value={newMember.email} onChange={(e) => setNewMember((v) => ({ ...v, email: e.target.value }))} placeholder="Email" required />
                      <input className="mk-input" value={newMember.phone} onChange={(e) => setNewMember((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone (optional)" />
                      <select className="mk-input" value={newMember.planId} onChange={(e) => setNewMember((v) => ({ ...v, planId: e.target.value }))}>
                        <option value="">No plan</option>
                        {memberPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price}</option>)}
                      </select>
                      <button className="mk-primary" type="submit" disabled={memberSaving}>{memberSaving ? "Adding…" : "Add member"}</button>
                    </form>
                  </div>

                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🎟️ Membership Plans</div>
                    <p style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 14 }}>Shown on the public Membership page.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {memberPlans.map((p) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", border: `1.5px solid ${BRAND.purpleLight}`, borderRadius: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.text }}>{p.name} · {p.price}</div>
                            <div style={{ fontSize: 11, color: BRAND.textLight }}>{p.periodMonths} month{p.periodMonths > 1 ? "s" : ""}{p.active ? "" : " · hidden"}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button className="mk-outline" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => handleTogglePlan(p)}>{p.active ? "Hide" : "Show"}</button>
                            <button className="mk-danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => handleDeletePlan(p)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleCreatePlan} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input className="mk-input" value={newPlan.name} onChange={(e) => setNewPlan((v) => ({ ...v, name: e.target.value }))} placeholder="Plan name (e.g. Student)" required />
                      <input className="mk-input" value={newPlan.price} onChange={(e) => setNewPlan((v) => ({ ...v, price: e.target.value }))} placeholder="Price (e.g. R200 / month)" required />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input className="mk-input" type="number" min={1} value={newPlan.periodMonths} onChange={(e) => setNewPlan((v) => ({ ...v, periodMonths: e.target.value }))} placeholder="Months" style={{ width: 90 }} />
                        <input className="mk-input" value={newPlan.description} onChange={(e) => setNewPlan((v) => ({ ...v, description: e.target.value }))} placeholder="Short description" />
                      </div>
                      <button className="mk-primary" type="submit" disabled={planSaving}>{planSaving ? "Adding…" : "Add plan"}</button>
                    </form>
                  </div>
                </div>

                <div className="panel">
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>All Members ({filtered.length})</div>
                  {filtered.length === 0 ? (
                    <div style={{ color: BRAND.textLight, fontSize: 14 }}>No members yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {filtered.map((m) => {
                        const act = isActive(m);
                        const expired = m.status === "active" && !!m.validUntil && m.validUntil < today;
                        return (
                          <div key={m.id} style={{ border: `1.5px solid ${BRAND.purpleLight}`, borderRadius: 12, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text }}>{m.name} <span style={{ fontFamily: "monospace", fontSize: 12, color: BRAND.purple }}>{m.memberCode}</span></div>
                                <div style={{ fontSize: 12, color: BRAND.textLight, wordBreak: "break-all" }}>{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                                <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 2 }}>{m.planName ?? "No plan"}</div>
                                {m.memberNames && m.memberNames.length > 0 && (
                                  <div style={{ fontSize: 12, color: BRAND.text, marginTop: 4, background: `${BRAND.purple}10`, borderRadius: 8, padding: "6px 10px" }}>
                                    👪 {m.memberNames.join(", ")}
                                    {!!m.extraMembers && m.extraMembers > 0 && <span style={{ color: BRAND.purple, fontWeight: 700 }}> · {m.extraMembers} extra</span>}
                                  </div>
                                )}
                                {(m.paidDate || m.validUntil) && (
                                  <div style={{ fontSize: 12, marginTop: 2, color: BRAND.text }}>
                                    {m.paidDate && <span>Paid <strong>{fmt(m.paidDate)}</strong></span>}
                                    {m.paidDate && m.validUntil && " · "}
                                    {m.validUntil && <span style={{ color: act ? "#16a34a" : "#b42318" }}>Expires <strong>{fmt(m.validUntil)}</strong></span>}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: act ? "rgba(22,163,74,0.12)" : expired ? "rgba(180,35,24,0.1)" : m.status === "pending" ? "rgba(243,218,91,0.4)" : "rgba(0,0,0,0.06)", color: act ? "#16a34a" : expired ? "#b42318" : m.status === "pending" ? "#8a6d00" : BRAND.textLight }}>
                                {act ? "Active" : expired ? "Expired" : m.status === "pending" ? "Pending" : "Cancelled"}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <label style={{ fontSize: 11, color: BRAND.textLight, display: "flex", alignItems: "center", gap: 5 }}>
                                Paid on
                                <input type="date" value={payDates[m.id] ?? today} onChange={(e) => setPayDates((p) => ({ ...p, [m.id]: e.target.value }))} style={{ border: `1.5px solid ${BRAND.purpleLight}`, borderRadius: 8, padding: "4px 6px", fontSize: 12, fontFamily: "inherit" }} />
                              </label>
                              {act
                                ? <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleMemberAction(m, "renew", payDates[m.id] ?? today)} disabled={busyMemberId === m.id}>Renew +period</button>
                                : <button className="mk-primary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => handleMemberAction(m, "activate", payDates[m.id] ?? today)} disabled={busyMemberId === m.id}>Mark paid / Activate</button>}
                              {m.status !== "cancelled" && <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleMemberAction(m, "cancel")} disabled={busyMemberId === m.id}>Cancel</button>}
                              <button className="mk-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleDeleteMember(m)} disabled={busyMemberId === m.id}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── Volunteers Tab ── */}
        {activeTab === "volunteers" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Applications</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Volunteers</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Volunteer applications submitted from the public “Apply to Volunteer” form.</p>
            </div>

            {volunteerMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b42318", background: "#fff0ee", border: "1px solid #f4c2be", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                {volunteerMsg}
              </div>
            )}

            <div className="panel">
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: BRAND.text }}>All Applications ({volunteers.length})</div>
              {volunteers.length === 0 ? (
                <div style={{ color: BRAND.textLight, fontSize: 14 }}>No volunteer applications yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {volunteers.map((v) => {
                    const open = expandedVolunteerId === v.id;
                    return (
                      <div key={v.id} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "14px 16px", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: BRAND.text }}>{v.fullName}</div>
                            <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 3, wordBreak: "break-all" }}>{v.email}{v.whatsappNumber ? ` · ${v.whatsappNumber}` : ""}{v.suburb ? ` · ${v.suburb}` : ""}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: v.agreeTerms ? "rgba(22,163,74,0.1)" : "rgba(180,35,24,0.08)", color: v.agreeTerms ? "#16a34a" : "#b42318" }}>
                                {v.agreeTerms ? "Agreed to terms" : "Did not agree"}
                              </span>
                              <span style={{ fontSize: 11, color: BRAND.textLight, padding: "3px 0" }}>Applied {new Date(v.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                            <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setExpandedVolunteerId(open ? null : v.id)}>
                              {open ? "Hide" : "View"}
                            </button>
                            <button className="mk-danger" onClick={() => handleDeleteVolunteer(v)} disabled={deletingVolunteerId === v.id}>
                              {deletingVolunteerId === v.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                        {open && (
                          <div style={{ borderTop: `1px solid ${BRAND.purpleLight}`, padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: "#faf8ff" }}>
                            {VOLUNTEER_ALL_FIELDS.map((f) => (
                              <div key={f.key}>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: BRAND.purple, marginBottom: 3 }}>{f.label}</div>
                                <div style={{ fontSize: 14, color: BRAND.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{answerToText(v.answers?.[f.key])}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === "settings" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="tag" style={{ color: BRAND.purple, marginBottom: 4 }}>Site</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: BRAND.text }}>Site Settings</h1>
              <p style={{ color: BRAND.textLight, marginTop: 6, fontSize: 14 }}>Edit entrance fees, opening hours, bookings and the announcement banner shown on the public site.</p>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="sub-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
                {SETTINGS_SUBTABS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setSettingsSubTab(t.key)} className={settingsSubTab === t.key ? "mk-primary" : "mk-outline"} style={{ fontSize: 12.5, padding: "8px 16px" }}>{t.label}</button>
                ))}
              </div>

              <div style={{ maxWidth: 680 }}>

                {settingsSubTab === "general" && (<>
                  {/* Bookings */}
                  <div className="panel" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>📅 Bookings</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>How many bookings can be taken for each hourly time slot.</p>
                    <label>
                      <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Max bookings per hour</div>
                      <input className="mk-input" type="number" min={1} value={settings.bookings_per_slot} onChange={(e) => setSettings((s) => ({ ...s, bookings_per_slot: e.target.value }))} placeholder="6" />
                    </label>
                  </div>

                  {/* Entrance Fees */}
                  <div className="panel" style={{ marginBottom: 20 }}>
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

                  {/* Hours */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🕐 Opening Hours</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Drives the hours banner, the Contact page, and which booking times the public can choose. Set a day to closed, or add one or more time blocks (e.g. a split day for prayer).</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {DISPLAY_ORDER.map((idx) => {
                        const day = hoursWeek[idx];
                        return (
                          <div key={idx} style={{ background: `${BRAND.purple}08`, borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: day.closed ? 0 : 10 }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text }}>{WEEKDAY_FULL[idx]}</div>
                              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: BRAND.textLight, cursor: "pointer" }}>
                                <input type="checkbox" checked={day.closed} onChange={(e) => toggleDayClosed(idx, e.target.checked)} style={{ width: 15, height: 15, accentColor: BRAND.purple }} />
                                Closed
                              </label>
                            </div>
                            {!day.closed && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {day.ranges.map((r, ri) => (
                                  <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input className="mk-input" type="time" value={r.start} onChange={(e) => setRange(idx, ri, { start: e.target.value })} style={{ flex: 1 }} />
                                    <span style={{ color: BRAND.textLight }}>–</span>
                                    <input className="mk-input" type="time" value={r.end} onChange={(e) => setRange(idx, ri, { end: e.target.value })} style={{ flex: 1 }} />
                                    <button type="button" onClick={() => removeRange(idx, ri)} title="Remove this block" style={{ border: "none", background: "transparent", color: BRAND.textLight, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>✕</button>
                                  </div>
                                ))}
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button type="button" className="mk-outline" onClick={() => addRange(idx)} style={{ fontSize: 12, padding: "6px 12px" }}>+ Add time block</button>
                                </div>
                                <input className="mk-input" value={day.note ?? ""} onChange={(e) => setDayNote(idx, e.target.value)} placeholder="Note (optional) — e.g. Closed 12:00 – 13:30 for prayer" style={{ fontSize: 12.5 }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact details (Find Us card) */}
                  <div className="panel" style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>📍 Contact details</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Shown in the “Find us” card on the Contact page.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Address (one line per row)</div>
                        <textarea className="mk-input" value={settings.contact_address} onChange={(e) => setSettings((s) => ({ ...s, contact_address: e.target.value }))} style={{ minHeight: 70, resize: "vertical" }} />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>“Open in Google Maps” link</div>
                        <input className="mk-input" value={settings.contact_maps_url} onChange={(e) => setSettings((s) => ({ ...s, contact_maps_url: e.target.value }))} placeholder="https://www.google.com/maps/..." />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Phone number</div>
                        <input className="mk-input" value={settings.contact_phone} onChange={(e) => setSettings((s) => ({ ...s, contact_phone: e.target.value }))} placeholder="+27 (0)31 000 0000" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>“Chat on WhatsApp” link</div>
                        <input className="mk-input" value={settings.contact_whatsapp_url} onChange={(e) => setSettings((s) => ({ ...s, contact_whatsapp_url: e.target.value }))} placeholder="https://wa.me/2731..." />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Email</div>
                        <input className="mk-input" value={settings.contact_email} onChange={(e) => setSettings((s) => ({ ...s, contact_email: e.target.value }))} placeholder="hello@meankatcafe.co.za" />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Socials line</div>
                        <input className="mk-input" value={settings.contact_socials} onChange={(e) => setSettings((s) => ({ ...s, contact_socials: e.target.value }))} placeholder="@meankatcafe_durban on Instagram, TikTok & Facebook" />
                      </label>
                    </div>
                  </div>
                </>)}

                {settingsSubTab === "banner" && (<>
                  {/* Announcement banner */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>📣 Announcement Banner</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>The scrolling banner under the nav.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input type="checkbox" checked={settings.announcement_enabled === "true"} onChange={(e) => setSettings((s) => ({ ...s, announcement_enabled: e.target.checked ? "true" : "false" }))} style={{ width: 16, height: 16, accentColor: BRAND.purple }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.text }}>Show banner</div>
                          <div style={{ fontSize: 11, color: BRAND.textLight }}>Uncheck to hide it from the site</div>
                        </div>
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Banner text</div>
                        <textarea className="mk-input" value={settings.announcement_text} onChange={(e) => setSettings((s) => ({ ...s, announcement_text: e.target.value }))} placeholder="🎉 Join us this Saturday for Cat & Canvas!" style={{ minHeight: 70, resize: "vertical" }} />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Scroll speed</div>
                        <select className="mk-input" value={settings.announcement_speed} onChange={(e) => setSettings((s) => ({ ...s, announcement_speed: e.target.value }))}>
                          <option value="45">Slow</option>
                          <option value="30">Medium</option>
                          <option value="18">Fast</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </>)}

                {settingsSubTab === "donate" && (<>
                  {/* Donate / Ways to Give */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>💜 Donate / Ways to Give</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Shown in the “Ways to Give” section on the How to Help page. Leave a field blank to hide it.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.purple }}>Banking details</div>
                      {([
                        ["bank_account_name", "Account name"],
                        ["bank_name", "Bank"],
                        ["bank_account_number", "Account number"],
                        ["bank_branch_code", "Branch code"],
                        ["bank_account_type", "Account type"],
                        ["bank_reference", "Payment reference"],
                      ] as const).map(([key, label]) => (
                        <label key={key}>
                          <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>{label}</div>
                          <input className="mk-input" value={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} />
                        </label>
                      ))}
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Secure online-pay link (optional — PayFast / Yoco / Paystack / donation page)</div>
                        <input className="mk-input" value={settings.secure_pay_url} onChange={(e) => setSettings((s) => ({ ...s, secure_pay_url: e.target.value }))} placeholder="https://pay.yoco.com/..." />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>BackaBuddy campaigns — one per line, “Title | https://…”</div>
                        <textarea className="mk-input" value={settings.backabuddy_links} onChange={(e) => setSettings((s) => ({ ...s, backabuddy_links: e.target.value }))} placeholder={"Help Smokey's surgery | https://www.backabuddy.co.za/..."} style={{ minHeight: 70, resize: "vertical" }} />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Wishlist — items we need, one per line</div>
                        <textarea className="mk-input" value={settings.donate_wishlist} onChange={(e) => setSettings((s) => ({ ...s, donate_wishlist: e.target.value }))} placeholder={"Cat food (wet & dry)\nClumping litter\nScratching posts"} style={{ minHeight: 90, resize: "vertical" }} />
                      </label>
                    </div>
                  </div>
                </>)}

                {settingsSubTab === "help" && (<>
                  {/* Foster network */}
                  <div className="panel" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🫶 Foster Network</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Featured on the About page after “Perks of the MeanKat life”.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Intro paragraph</div>
                        <textarea className="mk-input" value={settings.foster_intro} onChange={(e) => setSettings((s) => ({ ...s, foster_intro: e.target.value }))} style={{ minHeight: 90, resize: "vertical" }} />
                      </label>
                      <label>
                        <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Fosters — one per line, “Name | what they do”</div>
                        <textarea className="mk-input" value={settings.foster_list} onChange={(e) => setSettings((s) => ({ ...s, foster_list: e.target.value }))} placeholder={"Suzanne Kunz — PMB Kitten Fostering & Rescue | The rescue work that inspired MeanKat."} style={{ minHeight: 110, resize: "vertical" }} />
                      </label>
                    </div>
                  </div>

                  {/* How-to-Help posters */}
                  <div className="panel" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🖼️ How to Help Posters</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Each poster pops up when a visitor clicks that section’s button on the How to Help page. Leave one empty to keep its normal link.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {HELP_POSTER_SLOTS.map(({ slot, label }) => {
                        const url = settings[posterUrlKey(slot) as keyof SiteSettings];
                        const busy = posterUploadingSlot === `${slot}-poster`;
                        return (
                          <div key={slot}>
                            <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>{label}</div>
                            {url ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <img src={url} alt={`${label} poster`} style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.cream }} />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <label className="mk-outline" style={{ flex: 1, textAlign: "center", cursor: "pointer", padding: "9px" }}>
                                    {busy ? "Uploading…" : "Replace"}
                                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadHelpPoster(slot, f); e.target.value = ""; }} />
                                  </label>
                                  <button type="button" className="mk-danger" style={{ flex: 1 }} onClick={() => handleRemoveHelpPoster(slot)}>Remove</button>
                                </div>
                              </div>
                            ) : (
                              <label className="mk-outline" style={{ display: "block", textAlign: "center", cursor: "pointer", padding: "11px" }}>
                                {busy ? "Uploading…" : "Upload poster"}
                                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadHelpPoster(slot, f); e.target.value = ""; }} />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* How-to-Help block images (replace the emoji icons) */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🖼️ How to Help Block Images</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>The big image shown next to each section on the How to Help page. Leave empty to keep the emoji.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {HELP_POSTER_SLOTS.map(({ slot, label }) => {
                        const url = settings[imageUrlKey(slot) as keyof SiteSettings];
                        const busy = posterUploadingSlot === `${slot}-image`;
                        return (
                          <div key={slot}>
                            <div className="tag" style={{ color: BRAND.textLight, marginBottom: 8 }}>{label}</div>
                            {url ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <img src={url} alt={`${label} image`} style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.cream }} />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <label className="mk-outline" style={{ flex: 1, textAlign: "center", cursor: "pointer", padding: "9px" }}>
                                    {busy ? "Uploading…" : "Replace"}
                                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadHelpPoster(slot, f, "image"); e.target.value = ""; }} />
                                  </label>
                                  <button type="button" className="mk-danger" style={{ flex: 1 }} onClick={() => handleRemoveHelpPoster(slot, "image")}>Remove</button>
                                </div>
                              </div>
                            ) : (
                              <label className="mk-outline" style={{ display: "block", textAlign: "center", cursor: "pointer", padding: "11px" }}>
                                {busy ? "Uploading…" : "Upload image"}
                                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadHelpPoster(slot, f, "image"); e.target.value = ""; }} />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>)}

                {settingsSubTab === "access" && (<>
                  {/* Volunteer permissions */}
                  <div className="panel">
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: BRAND.text }}>🙌 Volunteer Permissions</div>
                    <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 18 }}>Choose which admin areas users with the <strong>Volunteer</strong> role can access. (Site Settings, Users and Photos stay admin-only.)</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {VOLUNTEER_AREA_OPTIONS.map((opt) => {
                        const on = settings.volunteer_permissions.split(",").map((x) => x.trim()).includes(opt.key);
                        return (
                          <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                            <input type="checkbox" checked={on} onChange={() => toggleVolPerm(opt.key)} style={{ width: 16, height: 16, accentColor: BRAND.purple }} />
                            <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.text }}>{opt.label}</div>
                          </label>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: BRAND.textLight, marginTop: 12 }}>Remember to click “Save settings” below.</p>
                  </div>
                </>)}

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

            <div className="tab-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Create user form */}
              <div className="panel sticky-form" style={{ position: "sticky", top: 20 }}>
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
                  <label>
                    <div className="tag" style={{ color: BRAND.textLight, marginBottom: 6 }}>Role</div>
                    <select className="mk-input" value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value as UserRole, is_admin: e.target.value === "admin" }))}>
                      <option value="admin">Admin — full access</option>
                      <option value="volunteer">Volunteer — limited access</option>
                    </select>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                      <div key={user.id} style={{ borderRadius: 12, border: `1.5px solid ${BRAND.purpleLight}`, background: BRAND.white, overflow: "hidden" }}>
                        {editingUserId === user.id ? (
                          <form onSubmit={(e) => handleSaveEditUser(e, user.id)} style={{ padding: "16px" }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: BRAND.text, marginBottom: 12 }}>Edit {user.email}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <label>
                                <div className="tag" style={{ color: BRAND.textLight, marginBottom: 5, fontSize: 10 }}>Email address</div>
                                <input className="mk-input" type="email" value={editUserForm.email} onChange={(e) => setEditUserForm((f) => ({ ...f, email: e.target.value }))} required />
                              </label>
                              <label>
                                <div className="tag" style={{ color: BRAND.textLight, marginBottom: 5, fontSize: 10 }}>New password (leave blank to keep current)</div>
                                <input className="mk-input" type="password" value={editUserForm.password} onChange={(e) => setEditUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" minLength={8} />
                              </label>
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button className="mk-primary" type="submit" disabled={editUserSaving} style={{ flex: 1 }}>{editUserSaving ? "Saving…" : "Save changes"}</button>
                                <button className="mk-outline" type="button" onClick={() => setEditingUserId(null)} style={{ flex: 1 }}>Cancel</button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.text, wordBreak: "break-all" }}>{user.email}</div>
                              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: user.role === "volunteer" ? "rgba(243,218,91,0.35)" : `${BRAND.purple}18`, color: user.role === "volunteer" ? "#8a6d00" : BRAND.purple }}>
                                  {user.role === "volunteer" ? "Volunteer" : "Admin"}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: user.is_approved ? "rgba(22,163,74,0.1)" : "rgba(180,35,24,0.08)", color: user.is_approved ? "#16a34a" : "#b42318" }}>
                                  {user.is_approved ? "Approved" : "Pending"}
                                </span>
                                <select value={user.role} disabled={togglingUserId === user.id} onChange={(e) => handleChangeRole(user, e.target.value as UserRole)} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, border: `1.5px solid ${BRAND.purpleLight}`, color: BRAND.text, background: BRAND.white }}>
                                  <option value="admin">Set: Admin</option>
                                  <option value="volunteer">Set: Volunteer</option>
                                </select>
                              </div>
                              <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 4 }}>
                                Created {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                              <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleStartEditUser(user)}>Edit</button>
                              <button className="mk-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleToggleUser(user, "is_approved")} disabled={togglingUserId === user.id}>
                                {user.is_approved ? "Revoke" : "Approve"}
                              </button>
                              <button className="mk-danger" onClick={() => handleDeleteUser(user)} disabled={deletingUserId === user.id}>
                                {deletingUserId === user.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>

      {cropTarget && (
        <CropEditor
          target={cropTarget}
          saving={cropSaving}
          onCancel={() => setCropTarget(null)}
          onSave={(t) => handleSaveCrop(cropTarget, t)}
        />
      )}
    </div>
  );
}

function CropEditor({ target, saving, onSave, onCancel }: { target: CropTarget; saving: boolean; onSave: (t: ImageTransform) => void; onCancel: () => void }) {
  const [t, setT] = useState<ImageTransform>(target.transform);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  function onPointerDown(e: ReactPointerEvent) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current || !boxRef.current) return;
    const w = boxRef.current.clientWidth;
    const h = boxRef.current.clientHeight;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setT((p) => ({
      zoom: p.zoom,
      x: Math.min(100, Math.max(0, p.x - (dx / w) * 100)),
      y: Math.min(100, Math.max(0, p.y - (dy / h) * 100)),
    }));
  }
  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: BRAND.white, borderRadius: 18, padding: 24, width: 380, maxWidth: "100%", boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ fontWeight: 900, fontSize: 17, color: BRAND.text, marginBottom: 4 }}>Adjust photo</div>
        <div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 16 }}>Drag the photo to reposition · use the slider to zoom. This is exactly how it appears on the site.</div>

        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ width: "100%", aspectRatio: "1", overflow: "hidden", borderRadius: 14, background: BRAND.purpleLight, cursor: dragging.current ? "grabbing" : "grab", touchAction: "none", border: `2px solid ${BRAND.purpleLight}` }}
        >
          <img src={target.url} alt="crop preview" draggable={false} style={transformToStyle(t)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: BRAND.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            <span>Zoom</span><span>{t.zoom.toFixed(2)}×</span>
          </div>
          <input type="range" min={1} max={4} step={0.05} value={t.zoom} onChange={(e) => setT((p) => ({ ...p, zoom: Number(e.target.value) }))} style={{ width: "100%", accentColor: BRAND.purple }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="mk-outline" type="button" onClick={() => setT({ zoom: 1, x: 50, y: 50 })} style={{ flex: 1 }}>Reset</button>
          <button className="mk-outline" type="button" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="mk-primary" type="button" onClick={() => onSave(t)} disabled={saving} style={{ flex: 1.4, width: "auto" }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
