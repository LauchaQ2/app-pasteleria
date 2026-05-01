import { ClientsCrud } from "@/components/clients/clients-crud";

export default function ClientesPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Clientes</h2>
      <p className="text-sm text-muted-foreground">
        Contacto, historial y preferencias de clientes.
      </p>
      <ClientsCrud />
    </section>
  );
}
