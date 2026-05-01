import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarioPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Calendario</h2>
        <p className="text-sm text-muted-foreground">
          Visualizá las entregas por semana, quincena o mes. Tocá un pedido para ver el detalle.
        </p>
      </div>

      <CalendarView />
    </section>
  );
}
