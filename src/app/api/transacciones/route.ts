import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transacciones")
    .select("id,tipo,categoria,descripcion,monto,fecha,pedido_id,estado_pago,created_at")
    .order("fecha", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
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
      .insert({
        tipo: body.tipo,
        categoria: body.categoria,
        descripcion: body.descripcion ?? null,
        monto: body.monto,
        fecha: body.fecha,
        pedido_id: body.pedido_id ?? null,
        estado_pago: body.estado_pago ?? "pendiente",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
