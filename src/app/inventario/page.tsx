import { InventoryCrud } from "@/components/inventory/inventory-crud";

export default function InventarioPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Inventario</h2>
      <p className="text-sm text-muted-foreground">
        Gestión de ingredientes con alertas por stock mínimo.
      </p>
      <InventoryCrud />
    </section>
  );
}
