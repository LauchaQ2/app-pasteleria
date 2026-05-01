export const PEDIDO_ESTADOS = [
  "pendiente",
  "confirmado",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
] as const;

export type PedidoEstado = (typeof PEDIDO_ESTADOS)[number];

export interface Pedido {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string;
  detalle: string;
  estado: PedidoEstado;
  fecha_entrega: string;
  total: number;
  pagado: boolean;
  created_at: string;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  producto_nombre?: string;
  producto_precio?: number;
}

export interface DashboardPedido {
  id: string;
  cliente_nombre: string;
  estado: PedidoEstado;
  fecha_entrega: string;
  total: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  preferencias: string | null;
  created_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  variantes: string[];
  foto_url: string | null;
  activo: boolean;
  created_at: string;
  receta?: RecetaIngrediente[];
}

export interface RecetaIngrediente {
  id?: string;
  producto_id?: string;
  inventario_id: string;
  cantidad: number;
  inventario_ingrediente?: string;
  inventario_unidad?: string;
}

export interface InventarioItem {
  id: string;
  ingrediente: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  updated_at: string;
}

export type TransaccionTipo = "ingreso" | "egreso";

export interface Transaccion {
  id: string;
  tipo: TransaccionTipo;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  pedido_id: string | null;
  created_at: string;
}
