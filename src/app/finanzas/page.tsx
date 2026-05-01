import { TransactionsCrud } from "@/components/finances/transactions-crud";

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const pedidoId = params.pedido ?? null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Finanzas</h2>
      <p className="text-sm text-muted-foreground">
        Ingresos, egresos, pagos y resultado del período.
      </p>
      <TransactionsCrud pedidoIdInicial={pedidoId} />
    </section>
  );
}
