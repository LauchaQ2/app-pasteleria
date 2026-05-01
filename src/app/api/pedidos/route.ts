import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PEDIDO_ESTADOS } from "@/types/domain";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("pedidos")
      .select("id,cliente_id,cliente_nombre,detalle,estado,fecha_entrega,total,pagado,created_at")
      .order("fecha_entrega", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
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
      cliente_nombre: string;
      detalle: string;
      estado: string;
      fecha_entrega: string;
      total: number;
      pagado: boolean;
    };

    if (!PEDIDO_ESTADOS.includes(body.estado as (typeof PEDIDO_ESTADOS)[number])) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_nombre: body.cliente_nombre,
        detalle: body.detalle,
        estado: body.estado,
        fecha_entrega: body.fecha_entrega,
        total: body.total,
        pagado: body.pagado,
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
