"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Producto } from "@/types/domain";

interface ProductoPayload {
  nombre: string;
  descripcion: string;
  precio: number;
  variantes: string;
  foto_url: string;
  activo: boolean;
}

const initialForm: ProductoPayload = {
  nombre: "",
  descripcion: "",
  precio: 0,
  variantes: "",
  foto_url: "",
  activo: true,
};

export function ProductsCrud() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<ProductoPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  async function loadProductos() {
    const response = await fetch("/api/productos", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudieron cargar productos");
      return;
    }
    setProductos((await response.json()) as Producto[]);
  }

  useEffect(() => {
    void loadProductos();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const endpoint = isEditing ? `/api/productos/${editingId}` : "/api/productos";
    const response = await fetch(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        variantes: form.variantes
          .split(",")
          .map((variant) => variant.trim())
          .filter(Boolean),
      }),
    });

    if (!response.ok) {
      setError("No se pudo guardar el producto");
      return;
    }

    setEditingId(null);
    setForm(initialForm);
    await loadProductos();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el producto");
      return;
    }
    await loadProductos();
  }

  function onEdit(producto: Producto) {
    setEditingId(producto.id);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precio: Number(producto.precio),
      variantes: (producto.variantes ?? []).join(", "),
      foto_url: producto.foto_url ?? "",
      activo: producto.activo,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar producto" : "Nuevo producto"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={form.descripcion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Precio</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, precio: Number(event.target.value) }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Variantes (separadas por coma)</label>
              <Input
                value={form.variantes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, variantes: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Foto URL</label>
              <Input
                value={form.foto_url}
                onChange={(event) => setForm((prev) => ({ ...prev, foto_url: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => setForm((prev) => ({ ...prev, activo: event.target.checked }))}
              />
              Activo
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
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {productos.map((producto) => (
            <article
              key={producto.id}
              className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{producto.nombre}</p>
                <p className="text-sm text-muted-foreground">${producto.precio}</p>
                <p className="text-sm text-muted-foreground">
                  {(producto.variantes ?? []).join(", ") || "Sin variantes"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(producto)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void onDelete(producto.id)}
                >
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
