import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      nombre: string;
      descripcion?: string;
      precio: number;
      variantes?: string[];
      foto_url?: string;
      activo?: boolean;
    };

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("productos")
      .update({
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        precio: body.precio,
        variantes: body.variantes ?? [],
        foto_url: body.foto_url ?? null,
        activo: body.activo ?? true,
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
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
  const { error } = await supabase.from("productos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
