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

create index if not exists idx_pedidos_fecha_entrega on public.pedidos(fecha_entrega);
create index if not exists idx_pedidos_estado on public.pedidos(estado);
create index if not exists idx_inventario_stock on public.inventario(stock_actual, stock_minimo);
create index if not exists idx_transacciones_fecha on public.transacciones(fecha);

alter table public.clientes enable row level security;
alter table public.productos enable row level security;
alter table public.inventario enable row level security;
alter table public.pedidos enable row level security;
alter table public.transacciones enable row level security;

drop policy if exists "public read clientes" on public.clientes;
drop policy if exists "public read productos" on public.productos;
drop policy if exists "public read inventario" on public.inventario;
drop policy if exists "public read pedidos" on public.pedidos;
drop policy if exists "public read transacciones" on public.transacciones;

drop policy if exists "authenticated write clientes" on public.clientes;
drop policy if exists "authenticated write productos" on public.productos;
drop policy if exists "authenticated write inventario" on public.inventario;
drop policy if exists "authenticated write pedidos" on public.pedidos;
drop policy if exists "authenticated write transacciones" on public.transacciones;

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

-- Allow authenticated users to insert/update/delete
create policy "authenticated write clientes"
on public.clientes for insert
with check (auth.role() = 'authenticated');

create policy "authenticated write productos"
on public.productos for insert
with check (auth.role() = 'authenticated');

create policy "authenticated write inventario"
on public.inventario for insert
with check (auth.role() = 'authenticated');

create policy "authenticated write pedidos"
on public.pedidos for insert
with check (auth.role() = 'authenticated');

create policy "authenticated write transacciones"
on public.transacciones for insert
with check (auth.role() = 'authenticated');
