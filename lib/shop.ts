// Shop domain types shared by the admin UI and the shop API routes.
// Prices are stored in CENTS (ZAR). Display as R{cents/100}.
// Products live in meankatcafe.products; orders in meankatcafe.orders/order_items.

export const SHOP_CATEGORIES = [
  "Treats",
  "Toys",
  "Feeding",
  "Beds & Comfort",
  "Grooming",
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

// Tile colour suggestions per category (fallback tile behind the product photo).
export const CATEGORY_TILE: Record<ShopCategory, string> = {
  Treats: "#fbee9b",
  Toys: "#f7daff",
  Feeding: "#faf3d4",
  "Beds & Comfort": "#efe2f5",
  Grooming: "#fbee9b",
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  description: string;
  badge?: string | null;
  emoji: string;
  tileColor: string;
  imageUrl?: string | null;
  active: boolean;
  stock?: number | null;
  sort: number;
  createdAt?: string;
};

export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  emoji?: string | null;
  unitPriceCents: number;
  qty: number;
};

export type Order = {
  id: string;
  reference: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  fulfilment: "ship" | "pickup";
  address: { street: string; city: string; postalCode: string } | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

// Turn a product name into a URL-safe slug (used when the admin adds a product).
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
