import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre,descripcion,precio,variantes,foto_url,activo,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
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
      .insert({
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        precio: body.precio,
        variantes: body.variantes ?? [],
        foto_url: body.foto_url ?? null,
        activo: body.activo ?? true,
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
