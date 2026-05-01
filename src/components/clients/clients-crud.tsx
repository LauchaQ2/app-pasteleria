"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Cliente } from "@/types/domain";

interface ClientePayload {
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  preferencias: string;
}

const initialForm: ClientePayload = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  preferencias: "",
};

export function ClientsCrud() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<ClientePayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  async function loadClientes() {
    const response = await fetch("/api/clientes", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudieron cargar clientes");
      return;
    }
    setClientes((await response.json()) as Cliente[]);
  }

  useEffect(() => {
    void loadClientes();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const endpoint = isEditing ? `/api/clientes/${editingId}` : "/api/clientes";
    const response = await fetch(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setError("No se pudo guardar el cliente");
      return;
    }

    setEditingId(null);
    setForm(initialForm);
    await loadClientes();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el cliente");
      return;
    }
    await loadClientes();
  }

  function onEdit(cliente: Cliente) {
    setEditingId(cliente.id);
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono ?? "",
      email: cliente.email ?? "",
      direccion: cliente.direccion ?? "",
      preferencias: cliente.preferencias ?? "",
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar cliente" : "Nuevo cliente"}</CardTitle>
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
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={form.telefono}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, telefono: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={form.direccion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, direccion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Preferencias</label>
              <Textarea
                value={form.preferencias}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, preferencias: event.target.value }))
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
          <CardTitle>Clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientes.map((cliente) => (
            <article
              key={cliente.id}
              className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{cliente.nombre}</p>
                <p className="text-sm text-muted-foreground">{cliente.telefono ?? "Sin teléfono"}</p>
                <p className="text-sm text-muted-foreground">{cliente.email ?? "Sin email"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/pedidos?cliente=${cliente.id}`}
                  className="text-xs text-primary underline"
                >
                  Ver pedidos
                </Link>
                <Button variant="outline" size="sm" onClick={() => onEdit(cliente)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void onDelete(cliente.id)}
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
