"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PEDIDO_ESTADOS, type Pedido, type PedidoEstado } from "@/types/domain";

interface PedidoPayload {
  cliente_nombre: string;
  detalle: string;
  estado: PedidoEstado;
  fecha_entrega: string;
  total: number;
  pagado: boolean;
}

const initialForm: PedidoPayload = {
  cliente_nombre: "",
  detalle: "",
  estado: "pendiente",
  fecha_entrega: "",
  total: 0,
  pagado: false,
};

export function OrdersCrud() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [form, setForm] = useState<PedidoPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  async function loadPedidos() {
    try {
      setLoading(true);
      const response = await fetch("/api/pedidos", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar pedidos");
      const data = (await response.json()) as Pedido[];
      setPedidos(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Error inesperado al cargar pedidos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPedidos();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const requestInit: RequestInit = {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    };

    const endpoint = isEditing ? `/api/pedidos/${editingId}` : "/api/pedidos";
    const response = await fetch(endpoint, requestInit);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo guardar el pedido");
      return;
    }

    setForm(initialForm);
    setEditingId(null);
    await loadPedidos();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el pedido");
      return;
    }
    await loadPedidos();
  }

  function onEdit(pedido: Pedido) {
    setEditingId(pedido.id);
    setForm({
      cliente_nombre: pedido.cliente_nombre,
      detalle: pedido.detalle,
      estado: pedido.estado,
      fecha_entrega: pedido.fecha_entrega,
      total: Number(pedido.total),
      pagado: pedido.pagado,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar pedido" : "Nuevo pedido"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Cliente</label>
              <Input
                value={form.cliente_nombre}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cliente_nombre: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Detalle</label>
              <Textarea
                value={form.detalle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, detalle: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Entrega</label>
                <Input
                  type="date"
                  value={form.fecha_entrega}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fecha_entrega: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Total</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, total: Number(event.target.value) }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Estado</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.estado}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, estado: event.target.value as PedidoEstado }))
                }
              >
                {PEDIDO_ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.pagado}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pagado: event.target.checked }))
                }
              />
              Pagado
            </label>
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
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
          {pedidos.map((pedido) => (
            <article
              key={pedido.id}
              className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{pedido.cliente_nombre}</p>
                <p className="text-sm text-muted-foreground">{pedido.detalle}</p>
                <p className="text-sm text-muted-foreground">Entrega: {pedido.fecha_entrega}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{pedido.estado}</Badge>
                <span className="text-sm font-medium">${pedido.total}</span>
                <Button variant="outline" size="sm" onClick={() => onEdit(pedido)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void onDelete(pedido.id)}
                >
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
          {!loading && pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pedidos cargados.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
