import { OrdersCrud } from "@/components/orders/orders-crud";

export default async function PedidosPage(props: {
  searchParams?: Promise<{ cliente?: string; pedido?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Registro completo de pedidos: creación, edición, estados y eliminación.
        </p>
      </div>
      <OrdersCrud
        clienteIdInicial={searchParams?.cliente}
        pedidoIdInicial={searchParams?.pedido}
      />
    </section>
  );
}
