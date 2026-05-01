import { ProductsCrud } from "@/components/products/products-crud";

export default function ProductosPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Productos</h2>
      <p className="text-sm text-muted-foreground">
        Catálogo con precios, variantes y estado activo.
      </p>
      <ProductsCrud />
    </section>
  );
}
