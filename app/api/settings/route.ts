import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const SETTINGS_DEFAULTS: Record<string, string> = {
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
  adopt_poster_url: "",
  adopt_poster_path: "",
  volunteer_poster_url: "",
  volunteer_poster_path: "",
  donate_poster_url: "",
  donate_poster_path: "",
  events_poster_url: "",
  events_poster_path: "",
};

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .schema("meankatcafe")
    .from("site_settings")
    .select("key, value");

  const result = { ...SETTINGS_DEFAULTS };
  if (data) {
    for (const row of data as { key: string; value: string }[]) {
      result[row.key] = row.value;
    }
  }
  return NextResponse.json(result);
}
