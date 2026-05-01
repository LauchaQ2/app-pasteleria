import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventario")
    .select("id,ingrediente,unidad,stock_actual,stock_minimo,updated_at")
    .order("ingrediente", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ingrediente: string;
      unidad: string;
      stock_actual: number;
      stock_minimo: number;
    };

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("inventario")
      .insert({
        ingrediente: body.ingrediente,
        unidad: body.unidad,
        stock_actual: body.stock_actual,
        stock_minimo: body.stock_minimo,
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
