import { cache } from "react";

import { apiFetch } from "@/lib/api/server";

export type Nota = { id: string; nota: string; fecha: string; autor: string };

export type RutaCliente = {
  id: string;
  cliente: string;
  saldo: number;
  mora: number;
  riesgo: string;
};

export type RutaOut = {
  clientes: RutaCliente[];
  plan: { orden: string[]; distancia_km: number; tiempo_min: number; fecha: string } | null;
};

export type ReporteDiario = {
  fecha: string;
  cobrado: number;
  prestado: number;
  visitados: number;
  sin_pago: number;
  inicio: string;
  fin: string;
};

export type PortfolioDetail = {
  id: string;
  nombre: string;
  descripcion: string | null;
  gestor: string | null;
  tipo_interes: number;
  num_cuotas: number;
  moneda: string;
  estatus: string;
  clientes: number;
  prestamos: number;
  saldo: number;
  mora: number;
  cobrado_30d: number;
  gastos_total: number;
  reportes_diarios: ReporteDiario[];
  caja: { saldo_inicial: number; saldo_actual: number; actualizado: string };
  liquidaciones: {
    cartera: string;
    fecha: string;
    periodo: string;
    cobrado: number;
    gastos: number;
    comision: number;
  }[];
  inyecciones: { fecha: string; valor: number; comentario: string; estado: string }[];
  gastos: { id: string; fecha: string; descripcion: string; valor: number; aprobado: boolean }[];
  estadisticas: { fecha: string; datos: Record<string, unknown> }[];
};

/**
 * Detalle de la cartera. El layout de la ficha y cada pestaña lo piden en el mismo render:
 * `cache` los junta en una sola llamada a la API.
 */
export const cargarCartera = cache((id: string) => apiFetch<PortfolioDetail>(`/pack/cobranza/portfolios/${id}`));
