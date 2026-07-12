import { NextResponse } from "next/server";
import { getSessionForArea } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Order } from "@/lib/shop";

// GET — admin list of shop orders (newest first) with line items.
export async function GET() {
  const session = await getSessionForArea("orders");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const { data: orders, error } = await supabase
    .schema("meankatcafe")
    .from("orders")
    .select("id, reference, email, first_name, last_name, phone, fulfilment, address, subtotal_cents, shipping_cents, total_cents, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !orders) return NextResponse.json({ error: error?.message ?? "Load failed." }, { status: 500 });

  const ids = orders.map((o) => o.id);
  const { data: items } = await supabase
    .schema("meankatcafe")
    .from("order_items")
    .select("id, order_id, product_id, name, emoji, unit_price_cents, qty")
    .in("order_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const result: Order[] = orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    email: o.email,
    firstName: o.first_name,
    lastName: o.last_name,
    phone: o.phone,
    fulfilment: o.fulfilment,
    address: o.address ?? null,
    subtotalCents: o.subtotal_cents,
    shippingCents: o.shipping_cents,
    totalCents: o.total_cents,
    status: o.status,
    createdAt: o.created_at,
    items: (items ?? [])
      .filter((it) => it.order_id === o.id)
      .map((it) => ({
        id: it.id,
        productId: it.product_id,
        name: it.name,
        emoji: it.emoji,
        unitPriceCents: it.unit_price_cents,
        qty: it.qty,
      })),
  }));

  return NextResponse.json(result);
}
