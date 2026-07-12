-- Shop: products, orders, order_items in the meankatcafe schema.
-- Products are managed from the café admin (Shop Products tab) and read by the
-- standalone shop app (Meankatcafeshop). Orders placed in the shop are written
-- back here and shown in the café admin (Shop Orders tab).
-- Prices stored in CENTS (ZAR). Display as R{cents/100}.
-- Applied via Supabase MCP on 2026-07-12.

create table if not exists meankatcafe.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  category    text not null,
  price_cents integer not null check (price_cents >= 0),
  description text not null default '',
  badge       text,
  emoji       text not null default '🐾',
  tile_color  text not null default '#f7daff',
  image_path  text,
  active      boolean not null default true,
  stock       integer,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists meankatcafe.orders (
  id             uuid primary key default gen_random_uuid(),
  reference      text unique not null,
  email          text not null,
  first_name     text not null,
  last_name      text not null,
  phone          text not null,
  fulfilment     text not null check (fulfilment in ('ship','pickup')),
  address        jsonb,
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents    integer not null,
  status         text not null default 'pending'
                   check (status in ('pending','paid','fulfilled','cancelled')),
  created_at     timestamptz not null default now()
);

create table if not exists meankatcafe.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references meankatcafe.orders(id) on delete cascade,
  product_id       text not null,
  name             text not null,
  emoji            text,
  unit_price_cents integer not null,
  qty              integer not null check (qty > 0)
);

create index if not exists products_active_sort_idx on meankatcafe.products (active, sort);
create index if not exists orders_reference_idx on meankatcafe.orders (reference);
create index if not exists orders_created_idx on meankatcafe.orders (created_at desc);
create index if not exists order_items_order_idx on meankatcafe.order_items (order_id);

alter table meankatcafe.products enable row level security;
alter table meankatcafe.orders enable row level security;
alter table meankatcafe.order_items enable row level security;

-- Seed the initial catalogue (matches the shop's original static list).
insert into meankatcafe.products (slug, name, category, price_cents, description, badge, emoji, tile_color, sort) values
  ('salmon',  'Salmon Crunch Treats',   'Treats',          5500, 'Oven-baked salmon crunchies packed with omega-3 for a shiny coat. The café gang goes feral for these — grain-free and vet-friendly.', 'Bestseller', '🐟', '#fbee9b', 10),
  ('jerky',   'Chicken Jerky Bites',    'Treats',          6000, 'Slow-dried free-range chicken, torn into bite-size strips. One ingredient, zero nonsense — a high-value reward for training or spoiling.', null, '🍗', '#fbee9b', 20),
  ('dental',  'Tuna Dental Sticks',     'Treats',          4800, 'Crunchy tuna sticks that scrub teeth as they chew. Fresher breath and happier gums, one snack at a time.', null, '🦷', '#fbee9b', 30),
  ('mice',    'Catnip Mice (3-pack)',   'Toys',            7500, 'Three plush mice stuffed with premium catnip and a rattle tail. Certified 3am-zoomies fuel — approved by every critic on the café floor.', 'Bestseller', '🐭', '#f7daff', 40),
  ('feather', 'Feather Teaser Wand',    'Toys',            6500, 'A bouncy wand with real feathers on a flexible rod. The fastest way to turn a grumpy cat into a hunter — great bonding play.', null, '🪶', '#f7daff', 50),
  ('crinkle', 'Crinkle Ball Set',       'Toys',            4500, 'A bag of six lightweight crinkle balls that skitter across the floor. Endlessly bat-able, impossible to resist.', null, '🧶', '#f7daff', 60),
  ('bowl',    'Ceramic Whisker Bowl',   'Feeding',        12000, 'A wide, shallow ceramic bowl designed to keep sensitive whiskers happy. Dishwasher-safe and heavy enough to stay put.', null, '🥣', '#faf3d4', 70),
  ('puzzle',  'Slow-Feed Puzzle Mat',   'Feeding',        14000, 'Turns mealtime into a game. Slows down fast eaters, sparks natural foraging, and keeps clever cats busy.', null, '🧩', '#faf3d4', 80),
  ('bed',     'Cloud Cat Bed',          'Beds & Comfort', 32000, 'A plush donut bed with high sides for that curled-up, safe-and-snug snooze cats love. Machine-washable cover.', 'Bestseller', '🛏️', '#efe2f5', 90),
  ('cave',    'Cozy Cave Hideout',      'Beds & Comfort', 38000, 'A soft felt cave for shy cats who need a hideaway. Cocoons out the noise so nervous rescues can finally relax.', null, '🏠', '#efe2f5', 100),
  ('brush',   'Deshedding Brush',       'Grooming',        9500, 'Gentle stainless bristles that lift loose undercoat without pulling. Less shedding, fewer hairballs, more purrs.', null, '🪮', '#fbee9b', 110),
  ('balm',    'Paw & Nose Balm',        'Grooming',        7000, 'A natural balm that soothes dry paw pads and noses. Made with skin-safe botanicals — lick-friendly and kind.', null, '🐾', '#fbee9b', 120)
on conflict (slug) do nothing;
