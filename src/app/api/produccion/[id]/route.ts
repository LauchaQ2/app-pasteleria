import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCCION_ETAPAS } from "@/types/domain";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      titulo?: string;
      descripcion?: string;
      fecha?: string;
      etapa?: string;
      completado?: boolean;
    };

    const payload: {
      titulo?: string;
      descripcion?: string | null;
      fecha?: string;
      etapa?: string;
      completado?: boolean;
    } = {};

    if (typeof body.titulo === "string") {
      const titulo = body.titulo.trim();
      if (!titulo) {
        return NextResponse.json({ error: "El titulo no puede estar vacio" }, { status: 400 });
      }
      payload.titulo = titulo;
    }

    if (typeof body.descripcion === "string") {
      payload.descripcion = body.descripcion.trim() || null;
    }

    if (typeof body.fecha === "string") {
      payload.fecha = body.fecha;
    }

    if (typeof body.etapa === "string") {
      if (!PRODUCCION_ETAPAS.includes(body.etapa as (typeof PRODUCCION_ETAPAS)[number])) {
        return NextResponse.json({ error: "Etapa de produccion invalida" }, { status: 400 });
      }
      payload.etapa = body.etapa;
    }

    if (typeof body.completado === "boolean") {
      payload.completado = body.completado;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("produccion_tareas")
      .update(payload)
      .eq("id", id)
      .select("id,titulo,descripcion,fecha,etapa,completado,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("produccion_tareas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
