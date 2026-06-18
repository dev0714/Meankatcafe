import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEFAULT_WEEK, parseWeek, type WeekHours } from "@/lib/hours";

// Server-side fetch of the editable opening hours from the `opening_hours`
// site setting. Falls back to DEFAULT_WEEK when there's no backend or nothing
// has been saved yet.
export async function getOpeningWeek(): Promise<WeekHours> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return DEFAULT_WEEK;
  }
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .schema("meankatcafe")
      .from("site_settings")
      .select("value")
      .eq("key", "opening_hours")
      .maybeSingle();
    return parseWeek((data?.value as string | undefined) ?? null);
  } catch {
    return DEFAULT_WEEK;
  }
}
