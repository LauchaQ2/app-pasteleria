"use client";

import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCCION_ETAPAS,
  type DashboardPedido,
  type ProduccionEtapa,
  type ProduccionTarea,
} from "@/types/domain";

type Vista = "semana" | "quincenal" | "mes";

const ESTADO_COLORES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  en_produccion: "bg-purple-100 text-purple-800 border-purple-300",
  listo: "bg-green-100 text-green-800 border-green-300",
  entregado: "bg-gray-100 text-gray-600 border-gray-300",
  cancelado: "bg-red-100 text-red-700 border-red-300",
};

const ETAPA_COLORES: Record<ProduccionEtapa, string> = {
  masa: "bg-amber-100 text-amber-800 border-amber-300",
  horneado: "bg-orange-100 text-orange-800 border-orange-300",
  relleno: "bg-cyan-100 text-cyan-800 border-cyan-300",
  decoracion: "bg-pink-100 text-pink-800 border-pink-300",
  empaque: "bg-indigo-100 text-indigo-800 border-indigo-300",
  otro: "bg-slate-100 text-slate-800 border-slate-300",
};

const ETAPA_LABELS: Record<ProduccionEtapa, string> = {
  masa: "Masa",
  horneado: "Horneado",
  relleno: "Relleno",
  decoracion: "Decoracion",
  empaque: "Empaque",
  otro: "Otro",
};

function getDias(vista: Vista, referencia: Date): Date[] {
  if (vista === "semana") {
    const inicio = startOfWeek(referencia, { weekStartsOn: 1 });
    const fin = endOfWeek(referencia, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }

  if (vista === "quincenal") {
    const inicio = startOfWeek(referencia, { weekStartsOn: 1 });
    const fin = addDays(inicio, 13);
    return eachDayOfInterval({ start: inicio, end: fin });
  }

  // mes
  const primerDia = startOfMonth(referencia);
  const ultimoDia = endOfMonth(referencia);
  const inicio = startOfWeek(primerDia, { weekStartsOn: 1 });
  const fin = endOfWeek(ultimoDia, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: inicio, end: fin });
}

function navegar(vista: Vista, referencia: Date, direccion: 1 | -1): Date {
  if (vista === "semana") return addDays(referencia, direccion * 7);
  if (vista === "quincenal") return addDays(referencia, direccion * 14);
  return direccion === 1 ? addMonths(referencia, 1) : subMonths(referencia, 1);
}

function titulo(vista: Vista, referencia: Date): string {
  if (vista === "semana") {
    const inicio = startOfWeek(referencia, { weekStartsOn: 1 });
    const fin = endOfWeek(referencia, { weekStartsOn: 1 });
    return `${format(inicio, "d MMM", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`;
  }
  if (vista === "quincenal") {
    const inicio = startOfWeek(referencia, { weekStartsOn: 1 });
    const fin = addDays(inicio, 13);
    return `${format(inicio, "d MMM", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`;
  }
  return format(referencia, "MMMM yyyy", { locale: es });
}

function getColumnasTareasPorDia(cantidad: number): number {
  if (cantidad <= 1) return 1;
  if (cantidad <= 4) return 2;
  return 3;
}

export function CalendarView() {
  const [vista, setVista] = useState<Vista>("mes");
  const [modoAlto, setModoAlto] = useState(false);
  const [referencia, setReferencia] = useState(new Date());
  const [pedidos, setPedidos] = useState<DashboardPedido[]>([]);
  const [tareasProduccion, setTareasProduccion] = useState<ProduccionTarea[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<DashboardPedido | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorProduccion, setErrorProduccion] = useState<string | null>(null);
  const [formProduccion, setFormProduccion] = useState({
    titulo: "",
    descripcion: "",
    etapa: "masa" as ProduccionEtapa,
    fecha: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [responsePedidos, responseProduccion] = await Promise.all([
          fetch("/api/pedidos", { cache: "no-store" }),
          fetch("/api/produccion", { cache: "no-store" }),
        ]);

        if (responsePedidos.ok) {
          const data = (await responsePedidos.json()) as DashboardPedido[];
          setPedidos(data);
        }

        if (responseProduccion.ok) {
          const data = (await responseProduccion.json()) as ProduccionTarea[];
          setTareasProduccion(data);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const dias = getDias(vista, referencia);

  const pedidosPorDia = (dia: Date): DashboardPedido[] =>
    pedidos.filter((p) =>
      isSameDay(new Date(`${p.fecha_entrega}T00:00:00`), dia)
    );

  const tareasPorDia = (dia: Date): ProduccionTarea[] =>
    tareasProduccion.filter((t) => isSameDay(new Date(`${t.fecha}T00:00:00`), dia));

  const tareasDiaSeleccionado = tareasPorDia(diaSeleccionado);
  const maxTareasEnVista = dias.reduce((max, dia) => {
    const cantidad = tareasPorDia(dia).length;
    return cantidad > max ? cantidad : max;
  }, 0);
  const minHeightMobile = modoAlto ? 170 : 90;
  const minHeightDesktop = modoAlto ? 260 : 140;
  const minHeightPorCarga = Math.min(maxTareasEnVista, 6) * 14;

  async function crearTareaProduccion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formProduccion.titulo.trim()) {
      setErrorProduccion("Escribi un titulo para la tarea");
      return;
    }

    setGuardando(true);
    setErrorProduccion(null);

    try {
      const response = await fetch("/api/produccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formProduccion),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setErrorProduccion(payload.error ?? "No se pudo guardar la tarea");
        return;
      }

      const nuevaTarea = (await response.json()) as ProduccionTarea;
      setTareasProduccion((prev) => [...prev, nuevaTarea]);
      setFormProduccion((prev) => ({ ...prev, titulo: "", descripcion: "" }));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoTarea(tarea: ProduccionTarea, completado: boolean) {
    const response = await fetch(`/api/produccion/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado }),
    });

    if (!response.ok) {
      return;
    }

    const actualizada = (await response.json()) as ProduccionTarea;
    setTareasProduccion((prev) =>
      prev.map((item) => (item.id === actualizada.id ? actualizada : item))
    );
  }

  async function eliminarTarea(tarea: ProduccionTarea) {
    const response = await fetch(`/api/produccion/${tarea.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    setTareasProduccion((prev) => prev.filter((item) => item.id !== tarea.id));
  }

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 self-start">
          <div className="flex gap-1 rounded-lg border p-1">
            {(["semana", "quincenal", "mes"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-md px-2 py-1 text-xs sm:px-3 sm:text-sm font-medium transition-colors ${
                  vista === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button
            variant={modoAlto ? "default" : "outline"}
            size="sm"
            onClick={() => setModoAlto((prev) => !prev)}
          >
            {modoAlto ? "Altura alta" : "Altura compacta"}
          </Button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReferencia(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReferencia((prev) => navegar(vista, prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center text-sm font-medium capitalize sm:min-w-40">
            {titulo(vista, referencia)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReferencia((prev) => navegar(vista, prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grilla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando pedidos…</p>
          ) : (
            <div className="w-full">
              {/* Cabecera días */}
              <div className="grid grid-cols-7 border-b">
                {diasSemana.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Filas de semanas */}
              <div
                className="grid grid-cols-7"
                style={{
                  gridTemplateRows: `repeat(${Math.ceil(dias.length / 7)}, minmax(${minHeightMobile + minHeightPorCarga}px, auto))`,
                }}
              >
                {dias.map((dia) => {
                  const esMesActual = isSameMonth(dia, referencia);
                  const esHoy = isToday(dia);
                  const pedidosDia = pedidosPorDia(dia);
                  const tareasDia = tareasPorDia(dia);
                  const diaSeleccionadoActual = isSameDay(dia, diaSeleccionado);

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`flex min-h-[90px] flex-col border-b border-r p-0.5 sm:min-h-[140px] sm:p-1 ${!esMesActual && vista === "mes" ? "bg-muted/30" : ""} ${diaSeleccionadoActual ? "ring-1 ring-primary" : ""} ${modoAlto ? "sm:min-h-[260px]" : ""}`}
                      style={{
                        minHeight: `${minHeightMobile + Math.min(tareasDia.length, 6) * 10}px`,
                      }}
                    >
                      <div
                        className={`mb-0.5 flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-sm font-medium ${
                          esHoy
                            ? "bg-primary text-primary-foreground"
                            : !esMesActual && vista === "mes"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {format(dia, "d")}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDiaSeleccionado(dia);
                          setFormProduccion((prev) => ({
                            ...prev,
                            fecha: format(dia, "yyyy-MM-dd"),
                          }));
                        }}
                        className="mb-1 w-full rounded text-left text-[9px] text-muted-foreground hover:bg-accent/50 sm:text-[10px]"
                      >
                        Cargar produccion
                      </button>

                      <div className="space-y-1">
                        {pedidosDia.map((pedido) => (
                          <div
                            key={pedido.id}
                            className={`rounded border px-0.5 sm:px-1 py-0.5 text-[9px] sm:text-xs font-medium ${
                              ESTADO_COLORES[pedido.estado] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-0.5">
                              <button
                                onClick={() =>
                                  setPedidoSeleccionado((prev) =>
                                    prev?.id === pedido.id ? null : pedido
                                  )
                                }
                                className="min-w-0 flex-1 truncate text-left transition-opacity hover:opacity-80"
                              >
                                <span className="hidden sm:inline">{pedido.cliente_nombre}</span>
                                <span className="sm:hidden">{pedido.cliente_nombre.split(" ")[0]}</span>
                              </button>
                              <Link
                                href={`/pedidos?pedido=${pedido.id}`}
                                className="shrink-0 text-[8px] sm:text-[10px] underline"
                              >
                                Ir
                              </Link>
                            </div>
                          </div>
                        ))}

                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateColumns: `repeat(${getColumnasTareasPorDia(tareasDia.length)}, minmax(0, 1fr))`,
                          }}
                        >
                          {tareasDia.slice(0, modoAlto ? 8 : 4).map((tarea) => (
                            <button
                              key={tarea.id}
                              type="button"
                              onClick={() => {
                                setDiaSeleccionado(dia);
                                setFormProduccion((prev) => ({
                                  ...prev,
                                  fecha: format(dia, "yyyy-MM-dd"),
                                }));
                              }}
                              className={`flex h-full min-h-[34px] w-full items-start rounded border px-1 py-1 text-left text-[9px] leading-tight sm:text-[10px] ${ETAPA_COLORES[tarea.etapa]} ${tarea.completado ? "line-through opacity-70" : ""}`}
                              title={tarea.titulo}
                            >
                              <span className="line-clamp-3 break-words">
                                {ETAPA_LABELS[tarea.etapa]}: {tarea.titulo}
                              </span>
                            </button>
                          ))}
                        </div>

                        {tareasDia.length > (modoAlto ? 8 : 4) ? (
                          <p className="px-1 text-[9px] text-muted-foreground sm:text-[10px]">
                            +{tareasDia.length - (modoAlto ? 8 : 4)} mas
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle pedido seleccionado */}
      {pedidoSeleccionado ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{pedidoSeleccionado.cliente_nombre}</p>
              <p className="text-sm text-muted-foreground">
                Entrega:{" "}
                {format(
                  new Date(`${pedidoSeleccionado.fecha_entrega}T00:00:00`),
                  "PPP",
                  { locale: es }
                )}
              </p>
              <p className="text-sm font-medium">${Number(pedidoSeleccionado.total).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  ESTADO_COLORES[pedidoSeleccionado.estado] ?? ""
                }
              >
                {pedidoSeleccionado.estado}
              </Badge>
              <Link href={`/pedidos?pedido=${pedidoSeleccionado.id}`}>
                <Button size="sm" variant="outline">Ir al pedido</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPedidoSeleccionado(null)}
              >
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cargar tarea de produccion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={crearTareaProduccion} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Fecha</label>
                <Input
                  type="date"
                  value={formProduccion.fecha}
                  onChange={(event) =>
                    setFormProduccion((prev) => ({ ...prev, fecha: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Etapa</label>
                <select
                  value={formProduccion.etapa}
                  onChange={(event) =>
                    setFormProduccion((prev) => ({
                      ...prev,
                      etapa: event.target.value as ProduccionEtapa,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRODUCCION_ETAPAS.map((etapa) => (
                    <option key={etapa} value={etapa}>
                      {ETAPA_LABELS[etapa]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Tarea</label>
                <Input
                  placeholder="Ej: Masa de alfajores de maicena"
                  value={formProduccion.titulo}
                  onChange={(event) =>
                    setFormProduccion((prev) => ({ ...prev, titulo: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Descripcion (opcional)</label>
                <Textarea
                  placeholder="Ej: 4 tandas de 3 kg"
                  value={formProduccion.descripcion}
                  onChange={(event) =>
                    setFormProduccion((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                />
              </div>

              {errorProduccion ? (
                <p className="text-xs text-red-600">{errorProduccion}</p>
              ) : null}

              <Button type="submit" size="sm" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar recordatorio"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Produccion del {format(diaSeleccionado, "PPP", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tareasDiaSeleccionado.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tareas cargadas para este dia.
              </p>
            ) : (
              tareasDiaSeleccionado.map((tarea) => (
                <div
                  key={tarea.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge className={ETAPA_COLORES[tarea.etapa]}>
                      {ETAPA_LABELS[tarea.etapa]}
                    </Badge>
                    <p className={`mt-1 text-sm font-medium ${tarea.completado ? "line-through text-muted-foreground" : ""}`}>
                      {tarea.titulo}
                    </p>
                    {tarea.descripcion ? (
                      <p className="text-xs text-muted-foreground">{tarea.descripcion}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void cambiarEstadoTarea(tarea, !tarea.completado)}
                    >
                      {tarea.completado ? "Reabrir" : "Completar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void eliminarTarea(tarea)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referencia de colores */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(ESTADO_COLORES).map(([estado, clases]) => (
          <span key={estado} className={`rounded border px-2 py-0.5 ${clases}`}>
            {estado}
          </span>
        ))}
        {Object.entries(ETAPA_COLORES).map(([etapa, clases]) => (
          <span key={etapa} className={`rounded border px-2 py-0.5 ${clases}`}>
            prod: {ETAPA_LABELS[etapa as ProduccionEtapa]}
          </span>
        ))}
      </div>
    </div>
  );
}
