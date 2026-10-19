create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, address text, city text, country text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, brand text, category text not null,
  description text, price numeric(10,2) not null, unit text not null default 'yd',
  image_url text, colors text[] not null default '{}', rating numeric(2,1) default 4.5, reviews int default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (true);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1, color text, saved_for_later boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.favorites (
  user_id uuid not null, product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, product_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "own favs" on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, status text not null default 'placed',
  subtotal numeric(10,2) not null, discount numeric(10,2) not null default 0, total numeric(10,2) not null,
  shipping_address text, items jsonb not null default '[]',
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "own orders insert" on public.orders for insert to authenticated with check (auth.uid() = user_id);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null default 'New chat',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;
create policy "own threads" on public.chat_threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null, message_id text not null, role text not null, parts jsonb not null,
  created_at timestamptz not null default now(),
  unique (thread_id, message_id)
);
grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "own messages" on public.chat_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.products (slug,name,brand,category,description,price,unit,colors,rating,reviews) values
('crushed-panne-velvet','Crushed Panne Velvet','Glitterbug','Velvet','A luxuriously soft crushed velvet with a liquid sheen. Perfect for evening wear, drapery and cushions.',6.59,'yd','{"#1e3a8a","#0f766e","#7f1d1d","#111827"}',4.6,120),
('silk-charmeuse','Silk Charmeuse','Maison Soie','Silk','Lightweight, fluid silk with a glossy face and matte back. Ideal for blouses, slips and linings.',18.90,'yd','{"#f5f0e1","#c084fc","#065f46"}',4.8,86),
('washed-linen','Stonewashed Linen','Nordic Loom','Linen','Breathable European linen, pre-washed for a lived-in softness. Great for shirts, dresses and table linen.',12.40,'yd','{"#d6cfc1","#6b7280","#365314"}',4.7,203),
('organic-cotton-poplin','Organic Cotton Poplin','Greenweave','Cotton','Crisp, tightly woven GOTS-certified cotton. Easy to sew and perfect for shirts and quilting.',7.25,'yd','{"#ffffff","#93c5fd","#fca5a5","#fde68a"}',4.5,310),
('merino-wool-boucle','Merino Wool Bouclé','Highland Mills','Wool','Textured looped bouclé in fine merino. Warm and structured for jackets and coats.',24.00,'yd','{"#e7e5e4","#78350f","#1f2937"}',4.9,54),
('indigo-denim','Selvedge Indigo Denim','Okayama Works','Denim','14oz Japanese selvedge denim, rope-dyed indigo that fades beautifully with wear.',21.50,'yd','{"#1e3a8a","#0c0a09"}',4.8,97),
('chiffon-georgette','Chiffon Georgette','Aurora','Chiffon','Sheer, airy georgette with a gentle crepe texture. Floats beautifully for scarves and overlays.',5.80,'yd','{"#fbcfe8","#a7f3d0","#fef3c7","#e0e7ff"}',4.4,140),
('worsted-yarn-380','Worsted Yarn 380yd','Woolly Co','Yarn','Soft acrylic-wool blend worsted weight yarn, 380 yards per skein. Machine washable.',3.37,'skein','{"#f9a8d4","#86efac","#fde047"}',4.6,412);