"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InventarioItem } from "@/types/domain";

interface InventarioPayload {
  ingrediente: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
}

const initialForm: InventarioPayload = {
  ingrediente: "",
  unidad: "",
  stock_actual: 0,
  stock_minimo: 0,
};

export function InventoryCrud() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [form, setForm] = useState<InventarioPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  async function loadItems() {
    const response = await fetch("/api/inventario", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudo cargar inventario");
      return;
    }
    setItems((await response.json()) as InventarioItem[]);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const endpoint = isEditing ? `/api/inventario/${editingId}` : "/api/inventario";
    const response = await fetch(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setError("No se pudo guardar el ítem");
      return;
    }

    setEditingId(null);
    setForm(initialForm);
    await loadItems();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/inventario/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el ítem");
      return;
    }
    await loadItems();
  }

  function onEdit(item: InventarioItem) {
    setEditingId(item.id);
    setForm({
      ingrediente: item.ingrediente,
      unidad: item.unidad,
      stock_actual: Number(item.stock_actual),
      stock_minimo: Number(item.stock_minimo),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar ítem" : "Nuevo ítem"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ingrediente</label>
              <Input
                value={form.ingrediente}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ingrediente: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Unidad</label>
              <Input
                value={form.unidad}
                onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Stock actual</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stock_actual}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stock_actual: Number(event.target.value) }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Stock mínimo</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stock_minimo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stock_minimo: Number(event.target.value) }))
                  }
                  required
                />
              </div>
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
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const lowStock = Number(item.stock_actual) <= Number(item.stock_minimo);

            return (
              <article
                key={item.id}
                className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{item.ingrediente}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.stock_actual} {item.unidad} / mínimo {item.stock_minimo}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lowStock ? <Badge className="border-destructive text-destructive">Stock bajo</Badge> : null}
                  <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDelete(item.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
