export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="max-w-md text-muted-foreground">
        La app está funcionando en modo offline. Cuando vuelvas a tener internet,
        se actualizarán los datos.
      </p>
    </main>
  );
}
