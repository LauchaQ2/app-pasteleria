import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarioPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Calendario</h2>
        <p className="text-sm text-muted-foreground">
          Visualiza entregas y planifica produccion por dia (masa, horneado, decoracion y mas) con recordatorios.
        </p>
      </div>

      <CalendarView />
    </section>
  );
}
