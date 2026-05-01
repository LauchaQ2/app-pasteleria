# Pastelería Manager

Sistema de gestión para emprendimiento de pastelería (alfajores, tortas, etc.) con soporte web + PWA.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui (base setup)
- Supabase (PostgreSQL, auth, storage)
- PWA (`next-pwa` + `manifest.json`)

## Configuración inicial

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env.local
```

Completar en `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Ejecutar el esquema SQL en Supabase:

- Archivo: `supabase/schema.sql`

4. (Opcional) Cargar datos de prueba:

- Archivo: `supabase/seed.sql`

5. Levantar entorno local:

```bash
npm run dev
```

## Módulos

- Dashboard con próximas entregas
- Pedidos (CRUD completo)
- Clientes (CRUD)
- Productos (CRUD)
- Inventario (CRUD + alertas de stock)
- Finanzas (CRUD de transacciones + resumen)
- Calendario (entregas cronológicas)

## PWA

- Manifest en `public/manifest.json`
- Fallback offline en `/offline`
- Service worker generado en build de producción (`npm run build && npm run start`)

## Scripts

- `npm run dev`: entorno de desarrollo
- `npm run build`: build producción (incluye generación PWA)
- `npm run start`: correr build producción
- `npm run lint`: lint del proyecto
