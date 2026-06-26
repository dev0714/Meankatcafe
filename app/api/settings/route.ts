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
