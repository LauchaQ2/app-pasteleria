"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Transaccion, TransaccionTipo } from "@/types/domain";

interface TransaccionPayload {
  tipo: TransaccionTipo;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

const initialForm: TransaccionPayload = {
  tipo: "ingreso",
  categoria: "",
  descripcion: "",
  monto: 0,
  fecha: new Date().toISOString().slice(0, 10),
};

export function TransactionsCrud() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [form, setForm] = useState<TransaccionPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const resumen = useMemo(() => {
    return transacciones.reduce(
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
    setTransacciones((await response.json()) as Transaccion[]);
  }

  useEffect(() => {
    void loadTransacciones();
  }, []);

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
            <CardTitle>Transacciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transacciones.map((transaction) => (
              <article
                key={transaction.id}
                className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{transaction.categoria}</p>
                  <p className="text-sm text-muted-foreground">{transaction.fecha}</p>
                  <p className="text-sm text-muted-foreground">{transaction.descripcion ?? "Sin detalle"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{transaction.tipo}</Badge>
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
