import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ProductoDisponibilidad {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  disponible: boolean;
  motivoNoDisponible: string | null;
  ingredientesFaltantes: Array<{
    ingrediente: string;
    stockActual: number;
    stockNecesario: number;
    unidad: string;
  }>;
}

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id,nombre,precio,activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (productosError) {
    return NextResponse.json({ error: productosError.message }, { status: 500 });
  }

  const { data: recetas, error: recetasError } = await supabase
    .from("producto_recetas")
    .select(
      "producto_id,cantidad,inventario:inventario_id(id,ingrediente,unidad,stock_actual)"
    );

  if (recetasError) {
    // Si la tabla aún no existe, devolver todos activos como disponibles
    if (recetasError.code === "42P01") {
      return NextResponse.json(
        (productos ?? []).map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          activo: producto.activo,
          disponible: true,
          motivoNoDisponible: null,
          ingredientesFaltantes: [],
        }))
      );
    }
    return NextResponse.json({ error: recetasError.message }, { status: 500 });
  }

  // Agrupar recetas por producto_id
  const recetasPorProducto = new Map<
    string,
    Array<{
      cantidad: number;
      inventario_id: string;
      ingrediente: string;
      unidad: string;
      stock_actual: number;
    }>
  >();

  for (const receta of recetas ?? []) {
    const inv = Array.isArray(receta.inventario)
      ? receta.inventario[0]
      : (receta.inventario as { id: string; ingrediente: string; unidad: string; stock_actual: number } | null);

    if (!inv) continue;

    const entry = {
      cantidad: Number(receta.cantidad),
      inventario_id: inv.id,
      ingrediente: inv.ingrediente,
      unidad: inv.unidad,
      stock_actual: Number(inv.stock_actual),
    };

    const existing = recetasPorProducto.get(receta.producto_id) ?? [];
    existing.push(entry);
    recetasPorProducto.set(receta.producto_id, existing);
  }

  const result: ProductoDisponibilidad[] = (productos ?? []).map((producto) => {
    const ingredientes = recetasPorProducto.get(producto.id) ?? [];

    // Si no tiene receta cargada, se considera disponible
    if (ingredientes.length === 0) {
      return {
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        activo: producto.activo,
        disponible: true,
        motivoNoDisponible: null,
        ingredientesFaltantes: [],
      };
    }

    const faltantes = ingredientes.filter(
      (ingrediente) => ingrediente.stock_actual < ingrediente.cantidad
    );

    return {
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      activo: producto.activo,
      disponible: faltantes.length === 0,
      motivoNoDisponible:
        faltantes.length > 0
          ? `Stock insuficiente: ${faltantes.map((f) => f.ingrediente).join(", ")}`
          : null,
      ingredientesFaltantes: faltantes.map((f) => ({
        ingrediente: f.ingrediente,
        stockActual: f.stock_actual,
        stockNecesario: f.cantidad,
        unidad: f.unidad,
      })),
    };
  });

  return NextResponse.json(result);
}
