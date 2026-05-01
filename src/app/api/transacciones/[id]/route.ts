import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      tipo: "ingreso" | "egreso";
      categoria: string;
      descripcion?: string;
      monto: number;
      fecha: string;
      pedido_id?: string;
      estado_pago?: "pendiente" | "cobrado" | "cancelado";
    };

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("transacciones")
      .update({
        tipo: body.tipo,
        categoria: body.categoria,
        descripcion: body.descripcion ?? null,
        monto: body.monto,
        fecha: body.fecha,
        pedido_id: body.pedido_id ?? null,
        estado_pago: body.estado_pago ?? "pendiente",
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
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
  const { error } = await supabase.from("transacciones").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
