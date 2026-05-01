"use client";

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
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardPedido } from "@/types/domain";

type Vista = "semana" | "quincenal" | "mes";

const ESTADO_COLORES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  en_produccion: "bg-purple-100 text-purple-800 border-purple-300",
  listo: "bg-green-100 text-green-800 border-green-300",
  entregado: "bg-gray-100 text-gray-600 border-gray-300",
  cancelado: "bg-red-100 text-red-700 border-red-300",
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

export function CalendarView() {
  const [vista, setVista] = useState<Vista>("mes");
  const [referencia, setReferencia] = useState(new Date());
  const [pedidos, setPedidos] = useState<DashboardPedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<DashboardPedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/pedidos", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as DashboardPedido[];
          setPedidos(data);
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

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border p-1">
          {(["semana", "quincenal", "mes"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                vista === v
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
          <span className="min-w-40 text-center text-sm font-medium capitalize">
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
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando pedidos…</p>
          ) : (
            <div className="min-w-[560px]">
              {/* Cabecera días */}
              <div className="grid grid-cols-7 border-b">
                {diasSemana.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Filas de semanas */}
              <div
                className="grid grid-cols-7"
                style={{
                  gridTemplateRows: `repeat(${Math.ceil(dias.length / 7)}, minmax(100px, auto))`,
                }}
              >
                {dias.map((dia, index) => {
                  const esMesActual = isSameMonth(dia, referencia);
                  const esHoy = isToday(dia);
                  const pedidosDia = pedidosPorDia(dia);

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`min-h-[100px] border-b border-r p-1 ${
                        index % 7 === 0 ? "" : ""
                      } ${!esMesActual && vista === "mes" ? "bg-muted/30" : ""}`}
                    >
                      <div
                        className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                          esHoy
                            ? "bg-primary text-primary-foreground"
                            : !esMesActual && vista === "mes"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {format(dia, "d")}
                      </div>

                      <div className="space-y-1">
                        {pedidosDia.map((pedido) => (
                          <button
                            key={pedido.id}
                            onClick={() =>
                              setPedidoSeleccionado((prev) =>
                                prev?.id === pedido.id ? null : pedido
                              )
                            }
                            className={`w-full truncate rounded border px-1 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80 ${
                              ESTADO_COLORES[pedido.estado] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {pedido.cliente_nombre}
                          </button>
                        ))}
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

      {/* Referencia de colores */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(ESTADO_COLORES).map(([estado, clases]) => (
          <span key={estado} className={`rounded border px-2 py-0.5 ${clases}`}>
            {estado}
          </span>
        ))}
      </div>
    </div>
  );
}
