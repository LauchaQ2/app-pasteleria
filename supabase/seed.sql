begin;

truncate table public.transacciones, public.pedidos, public.inventario, public.productos, public.clientes restart identity cascade;

insert into public.clientes (nombre, telefono, email, direccion, preferencias)
values
  ('María Gómez', '+54 11 5555-1111', 'maria.gomez@email.com', 'Belgrano 123, CABA', 'Sin TACC en tortas'),
  ('Juan Pérez', '+54 11 5555-2222', 'juan.perez@email.com', 'Mitre 456, CABA', 'Prefiere chocolate amargo'),
  ('Lucía Fernández', '+54 11 5555-3333', 'lucia.fernandez@email.com', 'San Martín 789, CABA', 'Alfajores surtidos para eventos');

insert into public.productos (nombre, descripcion, precio, variantes, foto_url, activo)
values
  ('Alfajor artesanal', 'Alfajor relleno de dulce de leche y cobertura de chocolate', 1800, '["blanco", "negro", "mixto"]'::jsonb, null, true),
  ('Torta de chocolate', 'Torta húmeda de chocolate con ganache', 28000, '["1kg", "2kg", "3kg"]'::jsonb, null, true),
  ('Cheesecake frutos rojos', 'Base crocante y cubierta de frutos rojos', 26000, '["1kg", "2kg"]'::jsonb, null, true),
  ('Box desayuno', 'Caja de desayuno con mini pastelería y café', 19500, '["clásico", "premium"]'::jsonb, null, true);

insert into public.inventario (ingrediente, unidad, stock_actual, stock_minimo)
values
  ('Harina 0000', 'kg', 25, 10),
  ('Azúcar', 'kg', 18, 8),
  ('Dulce de leche', 'kg', 6, 7),
  ('Chocolate cobertura', 'kg', 12, 6),
  ('Huevos', 'un', 90, 60),
  ('Manteca', 'kg', 4, 5);

insert into public.pedidos (cliente_id, cliente_nombre, detalle, estado, fecha_entrega, total, pagado)
values
  ((select id from public.clientes where nombre = 'María Gómez' limit 1), 'María Gómez', 'Torta de chocolate 2kg + 12 alfajores', 'confirmado', current_date + 2, 49600, false),
  ((select id from public.clientes where nombre = 'Juan Pérez' limit 1), 'Juan Pérez', 'Cheesecake 1kg para cumpleaños', 'en_produccion', current_date + 1, 26000, true),
  ((select id from public.clientes where nombre = 'Lucía Fernández' limit 1), 'Lucía Fernández', '50 alfajores surtidos para evento', 'pendiente', current_date + 5, 90000, false),
  ((select id from public.clientes where nombre = 'María Gómez' limit 1), 'María Gómez', 'Box desayuno premium x2', 'listo', current_date, 39000, true);

insert into public.transacciones (tipo, categoria, descripcion, monto, fecha, pedido_id)
values
  ('ingreso', 'Venta', 'Pago de pedido - Juan Pérez', 26000, current_date, (select id from public.pedidos where cliente_nombre = 'Juan Pérez' order by created_at desc limit 1)),
  ('ingreso', 'Venta', 'Pago de pedido - María Gómez', 39000, current_date, (select id from public.pedidos where cliente_nombre = 'María Gómez' and total = 39000 order by created_at desc limit 1)),
  ('egreso', 'Insumos', 'Compra de chocolate y manteca', 18500, current_date - 1, null),
  ('egreso', 'Packaging', 'Cajas y cintas para entregas', 7200, current_date - 2, null),
  ('egreso', 'Servicios', 'Envíos de pedidos', 6400, current_date - 1, null);

commit;
