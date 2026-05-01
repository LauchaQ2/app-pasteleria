"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PEDIDO_ESTADOS,
  type Cliente,
  type Pedido,
  type PedidoEstado,
} from "@/types/domain";

interface ProductoDisponibilidad {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  disponible: boolean;
  motivoNoDisponible: string | null;
  ingredientesFaltantes: Array<{
    ingrediente: string;
    stockActual: number;
    stockNecesario: number;
    unidad: string;
  }>;
}

interface PedidoPayload {
  cliente_id: string;
  estado: PedidoEstado;
  fecha_entrega: string;
  pagado: boolean;
  items: Array<{ producto_id: string; cantidad: number }>;
}

const initialForm: PedidoPayload = {
  cliente_id: "",
  estado: "pendiente",
  fecha_entrega: new Date().toISOString().slice(0, 10),
  pagado: false,
  items: [{ producto_id: "", cantidad: 1 }],
};

export function OrdersCrud() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<ProductoDisponibilidad[]>([]);
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

  async function loadClientes() {
    const response = await fetch("/api/clientes", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudieron cargar clientes");
      return;
    }
    const data = (await response.json()) as Cliente[];
    setClientes(data);
  }

  async function loadProductos() {
    const response = await fetch("/api/productos/disponibilidad", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudieron cargar productos");
      return;
    }
    setProductos((await response.json()) as ProductoDisponibilidad[]);
  }

  useEffect(() => {
    void loadPedidos();
    void loadClientes();
    void loadProductos();
  }, []);

  const totalPedido = useMemo(() => {
    return form.items.reduce((acc, item) => {
      const producto = productos.find((entry) => entry.id === item.producto_id);
      return acc + Number(producto?.precio ?? 0) * Number(item.cantidad);
    }, 0);
  }, [form.items, productos]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.cliente_id) {
      setError("Debes seleccionar un cliente existente");
      return;
    }

    if (form.items.filter((item) => item.producto_id && item.cantidad > 0).length === 0) {
      setError("Debes agregar al menos un producto");
      return;
    }

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
    if (!pedido.cliente_id) {
      setError("Este pedido no tiene cliente asociado. Créalo nuevamente con cliente.");
      return;
    }

    const items = (pedido.items ?? []).map((item) => ({
      producto_id: item.producto_id,
      cantidad: Number(item.cantidad),
    }));

    setEditingId(pedido.id);
    setForm({
      cliente_id: pedido.cliente_id,
      estado: pedido.estado,
      fecha_entrega: pedido.fecha_entrega,
      pagado: pedido.pagado,
      items: items.length > 0 ? items : [{ producto_id: "", cantidad: 1 }],
    });
  }

  function addItemRow() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { producto_id: "", cantidad: 1 }],
    }));
  }

  function removeItemRow(index: number) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        items: nextItems.length > 0 ? nextItems : [{ producto_id: "", cantidad: 1 }],
      };
    });
  }

  function updateItem(index: number, patch: { producto_id?: string; cantidad?: number }) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
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
              <label className="text-sm font-medium">Cliente (obligatorio)</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.cliente_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cliente_id: event.target.value }))
                }
                required
              >
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {clientes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay clientes cargados. Crea uno en <Link href="/clientes" className="underline">Clientes</Link> antes de generar un pedido.
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Productos del pedido</label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                  Agregar producto
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={`${index}-${editingId ?? "new"}`} className="space-y-1">
                    <div className="grid gap-2 sm:grid-cols-[1fr_96px_auto]">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={item.producto_id}
                        onChange={(event) => updateItem(index, { producto_id: event.target.value })}
                        required
                      >
                        <option value="">Selecciona un producto</option>
                        {productos.map((producto) => (
                          <option
                            key={producto.id}
                            value={producto.id}
                            disabled={!producto.disponible}
                          >
                            {producto.nombre}{!producto.disponible ? " ⚠ Sin stock" : ""}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.cantidad}
                        onChange={(event) =>
                          updateItem(index, { cantidad: Number(event.target.value) || 1 })
                        }
                        required
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeItemRow(index)}>
                        Quitar
                      </Button>
                    </div>
                    {(() => {
                      const productoSeleccionado = productos.find((p) => p.id === item.producto_id);
                      if (!productoSeleccionado || productoSeleccionado.disponible) return null;
                      return (
                        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                          <p className="font-medium">Stock insuficiente:</p>
                          {productoSeleccionado.ingredientesFaltantes.map((f) => (
                            <p key={f.ingrediente}>
                              • {f.ingrediente}: hay {f.stockActual} {f.unidad}, se necesita {f.stockNecesario} {f.unidad}
                            </p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                <label className="text-sm font-medium">Total estimado</label>
                <p className="flex h-10 items-center rounded-md border border-input px-3 text-sm font-medium">
                  ${totalPedido.toFixed(2)}
                </p>
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
              <Button type="submit" disabled={clientes.length === 0 || productos.length === 0}>
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{pedido.estado}</Badge>
                <span className="text-sm font-medium">${Number(pedido.total).toFixed(2)}</span>
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
