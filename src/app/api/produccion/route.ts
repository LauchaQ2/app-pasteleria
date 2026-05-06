import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCCION_ETAPAS } from "@/types/domain";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("produccion_tareas")
    .select("id,titulo,descripcion,fecha,etapa,completado,created_at")
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });

  if (desde) {
    query = query.gte("fecha", desde);
  }

  if (hasta) {
    query = query.lte("fecha", hasta);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      titulo?: string;
      descripcion?: string;
      fecha?: string;
      etapa?: string;
      completado?: boolean;
    };

    const titulo = body.titulo?.trim();

    if (!titulo) {
      return NextResponse.json({ error: "El titulo es obligatorio" }, { status: 400 });
    }

    if (!body.fecha) {
      return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
    }

    if (!body.etapa || !PRODUCCION_ETAPAS.includes(body.etapa as (typeof PRODUCCION_ETAPAS)[number])) {
      return NextResponse.json({ error: "Etapa de produccion invalida" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("produccion_tareas")
      .insert({
        titulo,
        descripcion: body.descripcion?.trim() || null,
        fecha: body.fecha,
        etapa: body.etapa,
        completado: Boolean(body.completado),
      })
      .select("id,titulo,descripcion,fecha,etapa,completado,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }
}
