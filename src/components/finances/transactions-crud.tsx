"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Transaccion, TransaccionEstadoPago, TransaccionTipo } from "@/types/domain";

interface TransaccionPayload {
  tipo: TransaccionTipo;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado_pago: TransaccionEstadoPago;
}

const initialForm: TransaccionPayload = {
  tipo: "ingreso",
  categoria: "",
  descripcion: "",
  monto: 0,
  fecha: new Date().toISOString().slice(0, 10),
  estado_pago: "pendiente",
};

const ESTADO_PAGO_COLORES: Record<TransaccionEstadoPago, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  cobrado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-700",
};

export function TransactionsCrud({ pedidoIdInicial }: { pedidoIdInicial?: string | null }) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [form, setForm] = useState<TransaccionPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filtroPedidoId, setFiltroPedidoId] = useState<string | null>(pedidoIdInicial ?? null);
  const resaltarId = useRef<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  function getTransaccionNumero(transaccionId: string) {
    const hash = [...transaccionId].reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) % 1_000_000,
      0
    );
    return hash.toString().padStart(6, "0");
  }

  const resumen = useMemo(() => {
    return transacciones
      .filter((t) => t.estado_pago !== "cancelado")
      .reduce(
        (acc, transaction) => {
          const value = Number(transaction.monto);
          if (transaction.tipo === "ingreso") {
            acc.ingresos += value;
          } else {
            acc.egresos += value;
          }
          return acc;
        },
        { ingresos: 0, egresos: 0 }
      );
  }, [transacciones]);

  async function loadTransacciones() {
    const response = await fetch("/api/transacciones", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudieron cargar transacciones");
      return;
    }

    const data = (await response.json()) as Transaccion[];
    setTransacciones(data);

    if (pedidoIdInicial) {
      const matched = data.find((transaction) => transaction.pedido_id === pedidoIdInicial);
      if (matched) {
        resaltarId.current = matched.id;
        setFiltroPedidoId(pedidoIdInicial);
      }
    }
  }

  useEffect(() => {
    void loadTransacciones();
  }, []);

  const transaccionesFiltradas = useMemo(() => {
    let lista = [...transacciones];

    if (filtroPedidoId) {
      lista = lista.filter((transaction) => transaction.pedido_id === filtroPedidoId);
    } else {
      if (filtroTipo !== "todos") {
        lista = lista.filter((transaction) => transaction.tipo === filtroTipo);
      }
      if (filtroEstado !== "todos") {
        lista = lista.filter((transaction) => transaction.estado_pago === filtroEstado);
      }
    }

    lista.sort((a, b) => {
      const diff = a.fecha.localeCompare(b.fecha);
      return sortDir === "asc" ? diff : -diff;
    });

    return lista;
  }, [transacciones, filtroPedidoId, filtroTipo, filtroEstado, sortDir]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const endpoint = isEditing ? `/api/transacciones/${editingId}` : "/api/transacciones";
    const response = await fetch(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setError("No se pudo guardar la transacción");
      return;
    }

    setEditingId(null);
    setForm(initialForm);
    await loadTransacciones();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/transacciones/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar la transacción");
      return;
    }
    await loadTransacciones();
  }

  function onEdit(transaction: Transaccion) {
    setEditingId(transaction.id);
    setForm({
      tipo: transaction.tipo,
      categoria: transaction.categoria,
      descripcion: transaction.descripcion ?? "",
      monto: Number(transaction.monto),
      fecha: transaction.fecha,
      estado_pago: (transaction.estado_pago as TransaccionEstadoPago) ?? "pendiente",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">${resumen.ingresos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">${resumen.egresos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">${(resumen.ingresos - resumen.egresos).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar transacción" : "Nueva transacción"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.tipo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, tipo: event.target.value as TransaccionTipo }))
                  }
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoría</label>
                <Input
                  value={form.categoria}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, categoria: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Monto</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, monto: Number(event.target.value) }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Estado de pago</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.estado_pago}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      estado_pago: event.target.value as TransaccionEstadoPago,
                    }))
                  }
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="cobrado">Cobrado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="submit">{isEditing ? "Actualizar" : "Crear"}</Button>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm(initialForm);
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Transacciones
                {filtroPedidoId ? (
                  <span className="ml-2 text-xs font-normal text-primary">
                    — filtrando por pedido
                    <button
                      className="ml-1 underline"
                      onClick={() => setFiltroPedidoId(null)}
                    >
                      quitar filtro
                    </button>
                  </span>
                ) : null}
              </span>
              {!filtroPedidoId ? (
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cobrado">Cobrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button
                    onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                    className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
                  >
                    Fecha {sortDir === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transaccionesFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay transacciones para mostrar.</p>
            ) : null}
            {transaccionesFiltradas.map((transaction) => (
              <article
                key={transaction.id}
                className={`flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between ${
                  resaltarId.current === transaction.id ? "border-primary ring-2 ring-primary/30" : ""
                }`}
              >
                <div>
                  <p className="text-2xl font-bold leading-none">#TX-{getTransaccionNumero(transaction.id)}</p>
                  <p className="mt-1 font-medium">{transaction.categoria}</p>
                  <p className="text-sm text-muted-foreground">{transaction.fecha}</p>
                  <p className="text-sm text-muted-foreground">{transaction.descripcion ?? "Sin detalle"}</p>
                  {transaction.pedido_id ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Pedido vinculado</p>
                      <Link
                        href={`/pedidos?pedido=${transaction.pedido_id}`}
                        className="text-xs text-primary underline"
                      >
                        Ver pedido
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{transaction.tipo}</Badge>
                  <Badge className={ESTADO_PAGO_COLORES[transaction.estado_pago as TransaccionEstadoPago] ?? ""}>
                    {transaction.estado_pago ?? "pendiente"}
                  </Badge>
                  <span className="text-sm font-medium">${transaction.monto}</span>
                  <Button variant="outline" size="sm" onClick={() => onEdit(transaction)}>
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDelete(transaction.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
