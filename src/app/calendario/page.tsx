import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardPedido } from "@/types/domain";

export default async function CalendarioPage() {
  let pedidos: DashboardPedido[] = [];

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("pedidos")
      .select("id,cliente_nombre,estado,fecha_entrega,total")
      .gte("fecha_entrega", new Date().toISOString().slice(0, 10))
      .order("fecha_entrega", { ascending: true })
      .limit(30);

    pedidos = (data ?? []) as DashboardPedido[];
  } catch {
    pedidos = [];
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Calendario</h2>
      <p className="text-sm text-muted-foreground">
        Entregas y producción próximas en orden cronológico.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Próximas entregas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay entregas programadas.</p>
          ) : (
            pedidos.map((pedido) => (
              <article
                key={pedido.id}
                className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{pedido.cliente_nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(`${pedido.fecha_entrega}T00:00:00`), "PPP", {
                      locale: es,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{pedido.estado}</Badge>
                  <span className="text-sm font-medium">${pedido.total}</span>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
