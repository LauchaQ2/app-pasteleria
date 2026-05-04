import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardPedido } from "@/types/domain";

export async function UpcomingOrders() {
  let pedidos: DashboardPedido[] = [];

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("pedidos")
      .select("id,cliente_nombre,estado,fecha_entrega,total")
      .gte("fecha_entrega", new Date().toISOString().slice(0, 10))
      .order("fecha_entrega", { ascending: true })
      .limit(8)
      .throwOnError();

    pedidos = (data ?? []) as DashboardPedido[];
  } catch {
    pedidos = [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas entregas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin datos todavía. Cargá variables de Supabase y creá pedidos.
          </p>
        ) : (
          pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
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
                <Link
                  href={`/pedidos?pedido=${pedido.id}`}
                  className="text-xs text-primary underline"
                >
                  Ver pedido
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
