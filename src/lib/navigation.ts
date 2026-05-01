import {
  CalendarClock,
  ClipboardList,
  Gauge,
  Package,
  Users,
  Wallet,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/calendario", label: "Calendario", icon: CalendarClock },
];
