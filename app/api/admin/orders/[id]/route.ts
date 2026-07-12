import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const STATUSES = ["pending", "paid", "fulfilled", "cancelled"] as const;

// PATCH — update an order's status (e.g. mark fulfilled or cancelled).
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("orders");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const status = body?.status as string | undefined;
  if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("meankatcafe")
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}
