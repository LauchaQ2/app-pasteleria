create table if not exists public.produccion_tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha date not null,
  etapa text not null default 'otro' check (etapa in ('masa','horneado','relleno','decoracion','empaque','otro')),
  completado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_produccion_tareas_fecha on public.produccion_tareas(fecha);
create index if not exists idx_produccion_tareas_etapa on public.produccion_tareas(etapa);

alter table public.produccion_tareas enable row level security;

drop policy if exists "public read produccion_tareas" on public.produccion_tareas;
drop policy if exists "public write produccion_tareas" on public.produccion_tareas;
drop policy if exists "public update produccion_tareas" on public.produccion_tareas;
drop policy if exists "public delete produccion_tareas" on public.produccion_tareas;

create policy "public read produccion_tareas"
on public.produccion_tareas for select
using (true);

create policy "public write produccion_tareas"
on public.produccion_tareas for insert
with check (true);

create policy "public update produccion_tareas"
on public.produccion_tareas for update
using (true)
with check (true);

create policy "public delete produccion_tareas"
on public.produccion_tareas for delete
using (true);
