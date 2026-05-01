-- Migración: agregar estado_pago a transacciones
-- Ejecutar en Supabase SQL Editor

alter table public.transacciones
  add column if not exists estado_pago text not null default 'pendiente'
  check (estado_pago in ('pendiente', 'cobrado', 'cancelado'));

create index if not exists idx_transacciones_estado_pago on public.transacciones(estado_pago);
create index if not exists idx_transacciones_tipo on public.transacciones(tipo);
