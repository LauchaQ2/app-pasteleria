import { TransactionsCrud } from "@/components/finances/transactions-crud";

export default function FinanzasPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Finanzas</h2>
      <p className="text-sm text-muted-foreground">
        Ingresos, egresos, pagos y resultado del período.
      </p>
      <TransactionsCrud />
    </section>
  );
}
