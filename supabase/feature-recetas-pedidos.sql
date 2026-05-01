begin;

create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12,2) not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.producto_recetas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  inventario_id uuid not null references public.inventario(id) on delete restrict,
  cantidad numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (producto_id, inventario_id)
);

create index if not exists idx_pedido_items_pedido on public.pedido_items(pedido_id);
create index if not exists idx_pedido_items_producto on public.pedido_items(producto_id);
create index if not exists idx_producto_recetas_producto on public.producto_recetas(producto_id);
create index if not exists idx_producto_recetas_inventario on public.producto_recetas(inventario_id);

alter table public.pedido_items enable row level security;
alter table public.producto_recetas enable row level security;

drop policy if exists "public read pedido_items" on public.pedido_items;
drop policy if exists "public write pedido_items" on public.pedido_items;
drop policy if exists "public update pedido_items" on public.pedido_items;
drop policy if exists "public delete pedido_items" on public.pedido_items;

drop policy if exists "public read producto_recetas" on public.producto_recetas;
drop policy if exists "public write producto_recetas" on public.producto_recetas;
drop policy if exists "public update producto_recetas" on public.producto_recetas;
drop policy if exists "public delete producto_recetas" on public.producto_recetas;

create policy "public read pedido_items"
on public.pedido_items for select
using (true);

create policy "public write pedido_items"
on public.pedido_items for insert
with check (true);

create policy "public update pedido_items"
on public.pedido_items for update
using (true)
with check (true);

create policy "public delete pedido_items"
on public.pedido_items for delete
using (true);

create policy "public read producto_recetas"
on public.producto_recetas for select
using (true);

create policy "public write producto_recetas"
on public.producto_recetas for insert
with check (true);

create policy "public update producto_recetas"
on public.producto_recetas for update
using (true)
with check (true);

create policy "public delete producto_recetas"
on public.producto_recetas for delete
using (true);

commit;
