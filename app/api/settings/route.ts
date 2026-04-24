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
