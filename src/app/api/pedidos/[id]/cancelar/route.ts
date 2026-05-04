import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createSupabaseServerClient();

  // Verificar que el pedido exista y no esté ya cancelado
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

  if (pedido.estado === "cancelado") {
    return NextResponse.json({ error: "El pedido ya está cancelado" }, { status: 400 });
  }

  if (pedido.estado === "entregado") {
    return NextResponse.json(
      { error: "No se puede cancelar un pedido ya entregado" },
      { status: 400 }
    );
  }

  // Obtener los items del pedido con sus recetas para devolver stock
  const { data: pedidoItems } = await supabase
    .from("pedido_items")
    .select("producto_id,cantidad")
    .eq("pedido_id", id);

  if (pedidoItems && pedidoItems.length > 0) {
    const productoIds = pedidoItems.map((item) => item.producto_id);

    const { data: recetas, error: recetasError } = await supabase
      .from("producto_recetas")
      .select("producto_id,cantidad,inventario:inventario_id(id,stock_actual)")
      .in("producto_id", productoIds);

    if (!recetasError && recetas) {
      // Calcular stock a reponer por ingrediente
      const stockAReponer = new Map<string, number>();

      for (const receta of recetas) {
        const pedidoItem = pedidoItems.find((item) => item.producto_id === receta.producto_id);
        if (!pedidoItem) continue;

        const inv = Array.isArray(receta.inventario) ? receta.inventario[0] : receta.inventario;
        if (!inv) continue;

        const cantidadReponer = Number(receta.cantidad) * Number(pedidoItem.cantidad);
        const actual = stockAReponer.get(inv.id) ?? 0;
        stockAReponer.set(inv.id, actual + cantidadReponer);
      }

      // Reponer stock ingrediente por ingrediente
      for (const [inventarioId, cantidadReponer] of stockAReponer) {
        const { data: inventarioActual } = await supabase
          .from("inventario")
          .select("stock_actual")
          .eq("id", inventarioId)
          .maybeSingle();

        if (inventarioActual) {
          const nuevoStock = Number(inventarioActual.stock_actual) + cantidadReponer;
          await supabase
            .from("inventario")
            .update({ stock_actual: nuevoStock })
            .eq("id", inventarioId);
        }
      }
    }
  }

  // Cambiar estado del pedido a "cancelado"
  const { data: pedidoActualizado, error: updateError } = await supabase
    .from("pedidos")
    .update({ estado: "cancelado" })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Cancelar la transacción asociada
  await supabase
    .from("transacciones")
    .update({ estado_pago: "cancelado" })
    .eq("pedido_id", id);

  return NextResponse.json(pedidoActualizado);
}
