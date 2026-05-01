create extension if not exists "pgcrypto";

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  preferencias text,
  created_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(12,2) not null default 0,
  variantes jsonb not null default '[]'::jsonb,
  foto_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  ingrediente text not null,
  unidad text not null,
  stock_actual numeric(12,2) not null default 0,
  stock_minimo numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null,
  detalle text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmado','en_produccion','listo','entregado','cancelado')),
  fecha_entrega date not null,
  total numeric(12,2) not null default 0,
  pagado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.transacciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','egreso')),
  categoria text not null,
  descripcion text,
  monto numeric(12,2) not null,
  fecha date not null default current_date,
  pedido_id uuid references public.pedidos(id) on delete set null,
  created_at timestamptz not null default now()
);

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

create index if not exists idx_pedidos_fecha_entrega on public.pedidos(fecha_entrega);
create index if not exists idx_pedidos_estado on public.pedidos(estado);
create index if not exists idx_inventario_stock on public.inventario(stock_actual, stock_minimo);
create index if not exists idx_transacciones_fecha on public.transacciones(fecha);
create index if not exists idx_pedido_items_pedido on public.pedido_items(pedido_id);
create index if not exists idx_pedido_items_producto on public.pedido_items(producto_id);
create index if not exists idx_producto_recetas_producto on public.producto_recetas(producto_id);
create index if not exists idx_producto_recetas_inventario on public.producto_recetas(inventario_id);

alter table public.clientes enable row level security;
alter table public.productos enable row level security;
alter table public.inventario enable row level security;
alter table public.pedidos enable row level security;
alter table public.transacciones enable row level security;
alter table public.pedido_items enable row level security;
alter table public.producto_recetas enable row level security;

drop policy if exists "public read clientes" on public.clientes;
drop policy if exists "public read productos" on public.productos;
drop policy if exists "public read inventario" on public.inventario;
drop policy if exists "public read pedidos" on public.pedidos;
drop policy if exists "public read transacciones" on public.transacciones;
drop policy if exists "public read pedido_items" on public.pedido_items;
drop policy if exists "public read producto_recetas" on public.producto_recetas;

drop policy if exists "public write clientes" on public.clientes;
drop policy if exists "public write productos" on public.productos;
drop policy if exists "public write inventario" on public.inventario;
drop policy if exists "public write pedidos" on public.pedidos;
drop policy if exists "public write transacciones" on public.transacciones;
drop policy if exists "public write pedido_items" on public.pedido_items;
drop policy if exists "public write producto_recetas" on public.producto_recetas;

drop policy if exists "public update clientes" on public.clientes;
drop policy if exists "public update productos" on public.productos;
drop policy if exists "public update inventario" on public.inventario;
drop policy if exists "public update pedidos" on public.pedidos;
drop policy if exists "public update transacciones" on public.transacciones;
drop policy if exists "public update pedido_items" on public.pedido_items;
drop policy if exists "public update producto_recetas" on public.producto_recetas;

drop policy if exists "public delete clientes" on public.clientes;
drop policy if exists "public delete productos" on public.productos;
drop policy if exists "public delete inventario" on public.inventario;
drop policy if exists "public delete pedidos" on public.pedidos;
drop policy if exists "public delete transacciones" on public.transacciones;
drop policy if exists "public delete pedido_items" on public.pedido_items;
drop policy if exists "public delete producto_recetas" on public.producto_recetas;

drop policy if exists "authenticated write clientes" on public.clientes;
drop policy if exists "authenticated write productos" on public.productos;
drop policy if exists "authenticated write inventario" on public.inventario;
drop policy if exists "authenticated write pedidos" on public.pedidos;
drop policy if exists "authenticated write transacciones" on public.transacciones;
drop policy if exists "authenticated write pedido_items" on public.pedido_items;
drop policy if exists "authenticated write producto_recetas" on public.producto_recetas;

-- Allow public read access to all tables
create policy "public read clientes"
on public.clientes for select
using (true);

create policy "public read productos"
on public.productos for select
using (true);

create policy "public read inventario"
on public.inventario for select
using (true);

create policy "public read pedidos"
on public.pedidos for select
using (true);

create policy "public read transacciones"
on public.transacciones for select
using (true);

create policy "public read pedido_items"
on public.pedido_items for select
using (true);

create policy "public read producto_recetas"
on public.producto_recetas for select
using (true);

-- Allow public write access to all tables
create policy "public write clientes"
on public.clientes for insert
with check (true);

create policy "public write productos"
on public.productos for insert
with check (true);

create policy "public write inventario"
on public.inventario for insert
with check (true);

create policy "public write pedidos"
on public.pedidos for insert
with check (true);

create policy "public write transacciones"
on public.transacciones for insert
with check (true);

create policy "public write pedido_items"
on public.pedido_items for insert
with check (true);

create policy "public write producto_recetas"
on public.producto_recetas for insert
with check (true);

create policy "public update clientes"
on public.clientes for update
using (true)
with check (true);

create policy "public update productos"
on public.productos for update
using (true)
with check (true);

create policy "public update inventario"
on public.inventario for update
using (true)
with check (true);

create policy "public update pedidos"
on public.pedidos for update
using (true)
with check (true);

create policy "public update transacciones"
on public.transacciones for update
using (true)
with check (true);

create policy "public update pedido_items"
on public.pedido_items for update
using (true)
with check (true);

create policy "public update producto_recetas"
on public.producto_recetas for update
using (true)
with check (true);

create policy "public delete clientes"
on public.clientes for delete
using (true);

create policy "public delete productos"
on public.productos for delete
using (true);

create policy "public delete inventario"
on public.inventario for delete
using (true);

create policy "public delete pedidos"
on public.pedidos for delete
using (true);

create policy "public delete transacciones"
on public.transacciones for delete
using (true);

create policy "public delete pedido_items"
on public.pedido_items for delete
using (true);

create policy "public delete producto_recetas"
on public.producto_recetas for delete
using (true);
