"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export function OrdersCrud(props: { clienteIdInicial?: string; pedidoIdInicial?: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<ProductoDisponibilidad[]>([]);
  const [form, setForm] = useState<PedidoPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clienteIdFiltro, setClienteIdFiltro] = useState<string | null>(
    props.clienteIdInicial ?? null
  );
  const [pedidoIdFiltro, setPedidoIdFiltro] = useState<string | null>(
    props.pedidoIdInicial ?? null
  );
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    if (!props.clienteIdInicial) return;
    setClienteIdFiltro(props.clienteIdInicial);
    setForm((prev) => ({ ...prev, cliente_id: props.clienteIdInicial ?? "" }));
  }, [props.clienteIdInicial]);

  useEffect(() => {
    setPedidoIdFiltro(props.pedidoIdInicial ?? null);
  }, [props.pedidoIdInicial]);

  function clearClienteFilter() {
    setClienteIdFiltro(null);
    router.replace(pathname);
  }

  function clearPedidoFilter() {
    setPedidoIdFiltro(null);
    router.replace(pathname);
  }

  function getPedidoNumero(pedidoId: string) {
    const hash = [...pedidoId].reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) % 1_000_000,
      0
    );
    return hash.toString().padStart(6, "0");
  }

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

    const itemsValidos = form.items.filter((item) => item.producto_id && item.cantidad > 0);
    if (itemsValidos.length === 0) {
      setError("Debes agregar al menos un producto");
      return;
    }

    // Agrupar productos duplicados para validar stock total
    const productosEnPedido = new Map<string, number>();
    for (const item of itemsValidos) {
      const actual = productosEnPedido.get(item.producto_id) ?? 0;
      productosEnPedido.set(item.producto_id, actual + Number(item.cantidad));
    }

    // Validar stock disponible para cada producto (considerando cantidad total)
    for (const [productoId, cantidadTotal] of productosEnPedido) {
      const producto = productos.find((p) => p.id === productoId);
      if (!producto) continue;

      // Calcular ingredientes que faltan para la cantidad total
      const ingredientesFaltantes = producto.ingredientesFaltantes.map((f) => ({
        ...f,
        stockNecesario: f.stockNecesario * cantidadTotal,
      }));

      const tieneProblemas = ingredientesFaltantes.some((f) => f.stockActual < f.stockNecesario);
      if (tieneProblemas) {
        const detalles = ingredientesFaltantes
          .filter((f) => f.stockActual < f.stockNecesario)
          .map((f) => `${f.ingrediente} (hay ${f.stockActual} ${f.unidad}, necesita ${f.stockNecesario} ${f.unidad})`)
          .join("; ");
        setError(`No hay stock suficiente para ${cantidadTotal}x ${producto.nombre}: ${detalles}`);
        return;
      }
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

  async function onCancelar(id: string) {
    if (!confirm("¿Cancelar este pedido? Se repondrá el stock de ingredientes y se cancelará la transacción asociada.")) return;
    const response = await fetch(`/api/pedidos/${id}/cancelar`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo cancelar el pedido");
      return;
    }
    await loadPedidos();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar definitivamente este pedido? Esta acción no se puede deshacer.")) return;
    const response = await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo eliminar el pedido");
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

  // Validar si una cantidad específica de un producto está disponible
  // Considera si el producto aparece varias veces en el formulario
  function getProductoAvailabilityForQuantity(
    productoId: string,
    cantidadEnFila: number
  ): { disponible: boolean; faltantes: Array<{ ingrediente: string; stockActual: number; stockNecesario: number; unidad: string }> } {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return { disponible: false, faltantes: [] };

    // Calcular cantidad total del producto en TODO el formulario
    const cantidadTotalEnPedido = form.items
      .filter((item) => item.producto_id === productoId)
      .reduce((sum, item) => sum + Number(item.cantidad), 0);

    // Ajustar ingredientes faltantes considerando la cantidad TOTAL pedida
    const ingredientesFaltantesAjustados = producto.ingredientesFaltantes.map((f) => ({
      ...f,
      stockNecesario: f.stockNecesario * cantidadTotalEnPedido,
    }));

    // Si hay ingredientes que no cumplen stock, marcar como no disponible
    const tieneStockInsuficiente = ingredientesFaltantesAjustados.some(
      (f) => f.stockActual < f.stockNecesario
    );

    return {
      disponible: !tieneStockInsuficiente && producto.disponible,
      faltantes: ingredientesFaltantesAjustados.filter((f) => f.stockActual < f.stockNecesario),
    };
  }

  // --- Sort y filtro ---
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const pedidosFiltrados = useMemo(() => {
    let lista = [...pedidos];
    if (pedidoIdFiltro) {
      lista = lista.filter((p) => p.id === pedidoIdFiltro);
    }
    if (clienteIdFiltro) {
      lista = lista.filter((p) => p.cliente_id === clienteIdFiltro);
    }
    if (filtroEstado !== "todos") {
      lista = lista.filter((p) => p.estado === filtroEstado);
    }
    lista.sort((a, b) => {
      const diff = a.fecha_entrega.localeCompare(b.fecha_entrega);
      return sortDir === "asc" ? diff : -diff;
    });
    return lista;
  }, [pedidos, pedidoIdFiltro, clienteIdFiltro, filtroEstado, sortDir]);

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
                      if (!item.producto_id) return null;
                      const disponibilidad = getProductoAvailabilityForQuantity(item.producto_id, item.cantidad);
                      if (disponibilidad.disponible) return null;
                      return (
                        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                          <p className="font-medium">Stock insuficiente para {item.cantidad}x:</p>
                          {disponibilidad.faltantes.map((f) => (
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
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Pedidos
              {clienteIdFiltro && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (Cliente: {clientes.find((c) => c.id === clienteIdFiltro)?.nombre ?? "Cargando..."})
                </span>
              )}
              {pedidoIdFiltro ? (
                <span className="ml-2 text-sm text-muted-foreground">(Pedido filtrado)</span>
              ) : null}
            </span>
            <div className="flex flex-wrap gap-2">
              {pedidoIdFiltro ? (
                <Button variant="outline" size="sm" onClick={clearPedidoFilter}>
                  Quitar filtro pedido
                </Button>
              ) : null}
              {clienteIdFiltro ? (
                <Button variant="outline" size="sm" onClick={clearClienteFilter}>
                  Quitar filtro cliente
                </Button>
              ) : null}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                {PEDIDO_ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <button
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
              >
                Fecha {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
          {pedidosFiltrados.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">No hay pedidos para mostrar.</p>
          ) : null}
          {pedidosFiltrados.map((pedido) => (
            <article
              key={pedido.id}
              className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-2xl font-bold leading-none">#{getPedidoNumero(pedido.id)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pedido.cliente_nombre}</p>
                <p className="text-sm text-muted-foreground">Entrega: {pedido.fecha_entrega}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{pedido.estado}</Badge>
                <span className="text-sm font-medium">${Number(pedido.total).toFixed(2)}</span>
                <Link
                  href={`/finanzas?pedido=${pedido.id}`}
                  className="text-xs text-primary underline"
                >
                  Ver transacción
                </Link>
                {pedido.estado !== "cancelado" && pedido.estado !== "entregado" ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(pedido)}>
                    Editar
                  </Button>
                ) : null}
                {pedido.estado !== "cancelado" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-400 text-orange-600 hover:bg-orange-50"
                    onClick={() => void onCancelar(pedido.id)}
                  >
                    Cancelar
                  </Button>
                ) : null}
                {pedido.estado === "cancelado" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDelete(pedido.id)}
                  >
                    Eliminar
                  </Button>
                ) : null}
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
