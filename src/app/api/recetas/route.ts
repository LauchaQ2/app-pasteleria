import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const productoId = request.nextUrl.searchParams.get("producto_id");

  if (!productoId) {
    return NextResponse.json({ error: "producto_id es requerido" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("producto_recetas")
    .select("id,producto_id,inventario_id,cantidad,inventario:inventario_id(ingrediente,unidad)")
    .eq("producto_id", productoId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? []).map((item) => {
    const inventario = item.inventario as
      | { ingrediente: string; unidad: string }
      | Array<{ ingrediente: string; unidad: string }>
      | null;

    const inventarioRecord = Array.isArray(inventario) ? inventario[0] : inventario;

    return {
      id: item.id,
      producto_id: item.producto_id,
      inventario_id: item.inventario_id,
      cantidad: Number(item.cantidad),
      inventario_ingrediente: inventarioRecord?.ingrediente ?? "",
      inventario_unidad: inventarioRecord?.unidad ?? "",
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      producto_id: string;
      ingredientes: Array<{ inventario_id: string; cantidad: number }>;
    };

    if (!body.producto_id) {
      return NextResponse.json({ error: "producto_id es requerido" }, { status: 400 });
    }

    const ingredientes = (body.ingredientes ?? []).filter(
      (item) => item.inventario_id && Number(item.cantidad) > 0
    );

    const supabase = createSupabaseServerClient();

    const { error: deleteError } = await supabase
      .from("producto_recetas")
      .delete()
      .eq("producto_id", body.producto_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (ingredientes.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const { data, error } = await supabase
      .from("producto_recetas")
      .insert(
        ingredientes.map((item) => ({
          producto_id: body.producto_id,
          inventario_id: item.inventario_id,
          cantidad: item.cantidad,
        }))
      )
      .select("id,producto_id,inventario_id,cantidad");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
