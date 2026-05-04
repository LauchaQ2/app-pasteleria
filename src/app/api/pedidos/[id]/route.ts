import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PEDIDO_ESTADOS } from "@/types/domain";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      cliente_id?: string;
      estado: string;
      fecha_entrega: string;
      pagado: boolean;
      items?: Array<{ producto_id: string; cantidad: number }>;
    };

    if (!PEDIDO_ESTADOS.includes(body.estado as (typeof PEDIDO_ESTADOS)[number])) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    if (!body.cliente_id) {
      return NextResponse.json(
        { error: "Debes seleccionar un cliente existente" },
        { status: 400 }
      );
    }

    const items = (body.items ?? []).filter(
      (item) => item.producto_id && Number(item.cantidad) > 0
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Debes agregar al menos un producto al pedido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id,nombre")
      .eq("id", body.cliente_id)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json({ error: clienteError.message }, { status: 500 });
    }

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado. Debes darlo de alta primero." },
        { status: 400 }
      );
    }

    const productoIds = [...new Set(items.map((item) => item.producto_id))];
    const { data: productos, error: productosError } = await supabase
      .from("productos")
      .select("id,nombre,precio,activo")
      .in("id", productoIds);

    if (productosError) {
      return NextResponse.json({ error: productosError.message }, { status: 500 });
    }

    const productosMap = new Map((productos ?? []).map((producto) => [producto.id, producto]));

    for (const item of items) {
      const producto = productosMap.get(item.producto_id);
      if (!producto) {
        return NextResponse.json(
          { error: "Uno de los productos seleccionados no existe" },
          { status: 400 }
        );
      }

      if (!producto.activo) {
        return NextResponse.json(
          { error: `El producto ${producto.nombre} está inactivo` },
          { status: 400 }
        );
      }
    }

    const totalCalculado = items.reduce((acc, item) => {
      const producto = productosMap.get(item.producto_id);
      return acc + Number(producto?.precio ?? 0) * Number(item.cantidad);
    }, 0);

    const detalle = items
      .map((item) => {
        const producto = productosMap.get(item.producto_id);
        return `${producto?.nombre ?? "Producto"} x${item.cantidad}`;
      })
      .join(" • ");

    const { data, error } = await supabase
      .from("pedidos")
      .update({
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        detalle,
        estado: body.estado,
        fecha_entrega: body.fecha_entrega,
        total: totalCalculado,
        pagado: body.pagado,
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const { error: deleteItemsError } = await supabase
      .from("pedido_items")
      .delete()
      .eq("pedido_id", id);

    if (deleteItemsError) {
      return NextResponse.json(
        {
          error:
            deleteItemsError.code === "42P01"
              ? "Falta migración de base de datos: ejecuta supabase/feature-recetas-pedidos.sql"
              : deleteItemsError.message,
        },
        { status: 500 }
      );
    }

    const { error: insertItemsError } = await supabase.from("pedido_items").insert(
      items.map((item) => ({
        pedido_id: id,
        producto_id: item.producto_id,
        cantidad: Number(item.cantidad),
      }))
    );

    if (insertItemsError) {
      return NextResponse.json(
        {
          error:
            insertItemsError.code === "42P01"
              ? "Falta migración de base de datos: ejecuta supabase/feature-recetas-pedidos.sql"
              : insertItemsError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data[0]);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createSupabaseServerClient();

  // Validar que el pedido esté en estado "cancelado" antes de permitir eliminación
  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("id,estado")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.estado !== "cancelado") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar pedidos cancelados. Primero cancelá el pedido." },
      { status: 400 }
    );
  }

  // Eliminar transacción asociada
  await supabase.from("transacciones").delete().eq("pedido_id", id);

  // Eliminar items del pedido
  await supabase.from("pedido_items").delete().eq("pedido_id", id);

  // Eliminar el pedido
  const { error } = await supabase.from("pedidos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
