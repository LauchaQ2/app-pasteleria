import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PEDIDO_ESTADOS } from "@/types/domain";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id,cliente_id,cliente_nombre,detalle,estado,fecha_entrega,total,pagado,created_at,pedido_items(id,pedido_id,producto_id,cantidad,productos(nombre,precio))"
      )
      .order("fecha_entrega", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((pedido) => ({
      ...pedido,
      total: Number(pedido.total),
      items: (pedido.pedido_items ?? []).map((item) => ({
        id: item.id,
        pedido_id: item.pedido_id,
        producto_id: item.producto_id,
        cantidad: Number(item.cantidad),
        producto_nombre: Array.isArray(item.productos)
          ? item.productos[0]?.nombre ?? ""
          : item.productos?.nombre ?? "",
        producto_precio: Number(
          Array.isArray(item.productos)
            ? item.productos[0]?.precio ?? 0
            : item.productos?.precio ?? 0
        ),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cliente_id?: string;
      cliente_nombre?: string;
      detalle?: string;
      estado: string;
      fecha_entrega: string;
      total?: number;
      pagado: boolean;
      items?: Array<{ producto_id: string; cantidad: number }>;
    };

    if (!PEDIDO_ESTADOS.includes(body.estado as (typeof PEDIDO_ESTADOS)[number])) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    if (!body.cliente_id) {
      return NextResponse.json(
        { error: "Debes seleccionar un cliente existente antes de crear el pedido" },
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

    // Validar disponibilidad de stock
    const { data: recetas, error: recetasError } = await supabase
      .from("producto_recetas")
      .select(
        "producto_id,cantidad,inventario:inventario_id(id,ingrediente,unidad,stock_actual)"
      )
      .in("producto_id", items.map((item) => item.producto_id));

    if (recetasError && recetasError.code !== "42P01") {
      return NextResponse.json({ error: recetasError.message }, { status: 500 });
    }

    // Agrupar recetas por producto
    const recetasPorProducto = new Map<
      string,
      Array<{ inventario_id: string; ingrediente: string; cantidad: number; stock_actual: number }>
    >();

    for (const receta of recetas ?? []) {
      const inv = Array.isArray(receta.inventario)
        ? receta.inventario[0]
        : receta.inventario;

      if (!inv) continue;

      const entry = {
        inventario_id: inv.id,
        ingrediente: inv.ingrediente,
        cantidad: Number(receta.cantidad),
        stock_actual: Number(inv.stock_actual),
      };

      const existing = recetasPorProducto.get(receta.producto_id) ?? [];
      existing.push(entry);
      recetasPorProducto.set(receta.producto_id, existing);
    }

    // Validar que haya suficiente stock para cada item
    // Primero agrupar items por producto para acumular cantidades
    const productosCantidades = new Map<string, number>();
    for (const item of items) {
      const actual = productosCantidades.get(item.producto_id) ?? 0;
      productosCantidades.set(item.producto_id, actual + Number(item.cantidad));
    }

    const ingredientesADescontar = new Map<string, number>();

    // Validar stock para la cantidad TOTAL de cada producto
    for (const [productoId, cantidadTotal] of productosCantidades) {
      const receta = recetasPorProducto.get(productoId);
      if (!receta || receta.length === 0) {
        // Si no tiene receta, se considera disponible sin descuentos
        continue;
      }

      for (const ingrediente of receta) {
        const cantidadNecesaria = ingrediente.cantidad * cantidadTotal;
        if (ingrediente.stock_actual < cantidadNecesaria) {
          const producto = productosMap.get(productoId);
          return NextResponse.json(
            {
              error: `Stock insuficiente de "${ingrediente.ingrediente}" para ${cantidadTotal}x ${producto?.nombre ?? "producto"}. Disponible: ${ingrediente.stock_actual}, Necesario: ${cantidadNecesaria}`,
            },
            { status: 400 }
          );
        }

        // Acumular cantidad a descontar
        const actual = ingredientesADescontar.get(ingrediente.inventario_id) ?? 0;
        ingredientesADescontar.set(ingrediente.inventario_id, actual + cantidadNecesaria);
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
      .insert({
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        detalle,
        estado: body.estado,
        fecha_entrega: body.fecha_entrega,
        total: totalCalculado,
        pagado: body.pagado,
      })
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("pedido_items").insert(
      items.map((item) => ({
        pedido_id: data.id,
        producto_id: item.producto_id,
        cantidad: Number(item.cantidad),
      }))
    );

    if (itemsError) {
      return NextResponse.json(
        {
          error:
            itemsError.code === "42P01"
              ? "Falta migración de base de datos: ejecuta supabase/feature-recetas-pedidos.sql"
              : itemsError.message,
        },
        { status: 500 }
      );
    }

    // Descontar del inventario
    if (ingredientesADescontar.size > 0) {
      for (const [inventario_id, cantidadADescontar] of ingredientesADescontar) {
        // Obtener stock actual
        const { data: inventarioActual, error: getError } = await supabase
          .from("inventario")
          .select("id,stock_actual")
          .eq("id", inventario_id)
          .maybeSingle();

        if (getError) {
          console.error("Error obteniendo stock:", getError);
          continue;
        }

        if (!inventarioActual) {
          console.error("Ingrediente no encontrado:", inventario_id);
          continue;
        }

        const nuevoStock = Number(inventarioActual.stock_actual) - Number(cantidadADescontar);

        // Actualizar stock
        const { error: updateError } = await supabase
          .from("inventario")
          .update({ stock_actual: Math.max(0, nuevoStock) })
          .eq("id", inventario_id);

        if (updateError) {
          console.error("Error actualizando stock de", inventario_id, updateError);
        }
      }
    }

    // Auto-crear transacción vinculada al pedido con estado pendiente
    await supabase.from("transacciones").insert({
      tipo: "ingreso",
      categoria: "Venta",
      descripcion: `Pedido de ${cliente.nombre}: ${detalle}`,
      monto: totalCalculado,
      fecha: body.fecha_entrega,
      pedido_id: data.id,
      estado_pago: body.pagado ? "cobrado" : "pendiente",
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
