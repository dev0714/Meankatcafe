import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Disconnect a channel.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSessionForArea("social");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const accountId = id?.trim();
  if (!accountId) return NextResponse.json({ error: "Missing account id." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .schema("socialsync")
    .from("social_accounts")
    .delete()
    .eq("id", accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
