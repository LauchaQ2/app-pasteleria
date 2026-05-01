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

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
