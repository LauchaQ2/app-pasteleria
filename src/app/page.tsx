import { UpcomingOrders } from "@/components/dashboard/upcoming-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";

async function getStatistics() {
  const supabase = await createSupabaseServerClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().setDate(1)), "yyyy-MM-dd");

  try {
    // Pedidos activos (no entregados ni cancelados)
    const { data: activeOrders } = await supabase
      .from("pedidos")
      .select("id")
      .in("estado", ["pendiente", "confirmado", "en_produccion", "listo"]);

    // Entregas hoy
    const { data: todayOrders } = await supabase
      .from("pedidos")
      .select("id")
      .eq("fecha_entrega", today);

    // Ingresos del mes
    const { data: monthTransactions } = await supabase
      .from("transacciones")
      .select("monto")
      .eq("tipo", "ingreso")
      .gte("fecha", monthStart);

    // Alertas de stock (stock_actual <= stock_minimo)
    const { data: lowStock } = await supabase
      .from("inventario")
      .select("id")
      .lte("stock_actual", supabase.from("inventario").select("stock_minimo"));

    // Contar items con stock bajo manualmente
    const { data: allInventory } = await supabase
      .from("inventario")
      .select("stock_actual, stock_minimo");

    const lowStockCount = (allInventory || []).filter(
      (item: any) => Number(item.stock_actual) <= Number(item.stock_minimo)
    ).length;

    const monthlyIncome = (monthTransactions || [])
      .reduce((sum: number, t: any) => sum + Number(t.monto), 0)
      .toLocaleString("es-AR", { style: "currency", currency: "ARS" });

    return {
      activeOrders: (activeOrders || []).length,
      todayOrders: (todayOrders || []).length,
      monthlyIncome,
      lowStockCount,
    };
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return {
      activeOrders: 0,
      todayOrders: 0,
      monthlyIncome: "$0",
      lowStockCount: 0,
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStatistics();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Resumen de pedidos próximos y estado general del negocio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pedidos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entregas hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.todayOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.monthlyIncome}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alertas de stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-orange-600">
              {stats.lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <UpcomingOrders />
    </section>
  );
}
