import { getSession } from "./session";
import type { SessionData } from "./session";
import { getSupabaseAdminClient } from "./supabase";

// Admin areas a volunteer can be granted access to.
export const VOLUNTEER_AREAS = ["cats", "events", "bookings", "volunteers", "members", "social"] as const;
export type VolunteerArea = (typeof VOLUNTEER_AREAS)[number];

export const VOLUNTEER_AREA_LABELS: Record<VolunteerArea, string> = {
  cats: "Cats",
  events: "Events",
  bookings: "Bookings",
  volunteers: "Volunteer applications",
  members: "Members (door check)",
  social: "Social Studio",
};

export const DEFAULT_VOLUNTEER_PERMISSIONS = "cats,events,bookings,volunteers";

export async function getVolunteerPermissions(): Promise<string[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return DEFAULT_VOLUNTEER_PERMISSIONS.split(",");
  }
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("value")
    .eq("key", "volunteer_permissions")
    .maybeSingle();
  const raw = (data?.value as string) ?? DEFAULT_VOLUNTEER_PERMISSIONS;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// Returns the session if the caller may access `area`, otherwise null.
// Full admins can access everything; volunteers only the areas granted in settings.
export async function getSessionForArea(area: VolunteerArea): Promise<SessionData | null> {
  const session = await getSession();
  if (!session?.isApproved) return null;
  if (session.isAdmin) return session;
  if (session.role === "volunteer") {
    const perms = await getVolunteerPermissions();
    if (perms.includes(area)) return session;
  }
  return null;
}
