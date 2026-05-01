"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-4 md:block">
        <p className="mb-6 text-lg font-semibold">Pastelería Manager</p>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <header className="border-b bg-card px-4 py-3">
          <h1 className="text-base font-semibold md:text-lg">Sistema de Gestión</h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card p-2 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "min-w-18 flex flex-col items-center rounded-md px-2 py-2 text-[11px]",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

