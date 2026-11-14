import { cache } from "react";
import { notFound } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { ConnectionsConsole } from "@/lib/api/types";
import { tienePestana, tipoDeFicha, type Pestana, type TipoDeFicha } from "@/lib/conexion-ficha";
import type { ConexionConsola } from "@/lib/conexiones";

/** La API pagina la consola de a 100 como máximo (`page_size le=100`). */
const POR_PAGINA = 100;
const MAX_PAGINAS = 10;

// Sin `runtime`: todo negocio corre en el Agent OS (ADR-0191); la API deja de mandarlo.
export type ConsolaCompleta = Omit<ConnectionsConsole, "items" | "page" | "page_size" | "has_more" | "runtime"> & {
  items: ConexionConsola[];
};

/**
 * Todas las conexiones de la consola (se recorren las páginas). Con `cache()` el layout de la
 * ficha y su pestaña comparten una sola carga por request.
 */
export const cargarConsola = cache(async (): Promise<{ ok: true; data: ConsolaCompleta } | { ok: false; error: string }> => {
  const items: ConexionConsola[] = [];
  let primera: ConnectionsConsole | null = null;
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const res = await apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=${POR_PAGINA}`);
    if (!res.ok) return { ok: false, error: res.error };
    primera ??= res.data;
    items.push(...res.data.items);
    if (!res.data.has_more) break;
  }
  const p = primera as ConnectionsConsole;
  return {
    ok: true,
    data: {
      items,
      total: p.total,
      consistency: p.consistency,
      can_edit: p.can_edit,
      unassigned_agents: p.unassigned_agents,
    },
  };
});

export type FichaCargada = {
  conexion: ConexionConsola;
  tipo: TipoDeFicha;
  consola: ConsolaCompleta;
};

/** La conexión de la ficha, o `null` si no es del negocio. */
export const cargarFicha = cache(async (id: string): Promise<{ ok: true; ficha: FichaCargada | null } | { ok: false; error: string }> => {
  const res = await cargarConsola();
  if (!res.ok) return res;
  const conexion = res.data.items.find((c) => c.id === id);
  return { ok: true, ficha: conexion ? { conexion, tipo: tipoDeFicha(conexion), consola: res.data } : null };
});

/**
 * La ficha de una pestaña: `notFound()` si la conexión no es del negocio o su tipo no tiene esa
 * pestaña (Agentes en una integración, Plantillas en WhatsApp Web…). El error de carga lo
 * muestra el layout.
 */
export async function fichaDePestana(id: string, pestana: Pestana): Promise<FichaCargada | null> {
  const res = await cargarFicha(id);
  if (!res.ok) return null;
  if (!res.ficha || !tienePestana(res.ficha.tipo, pestana)) notFound();
  return res.ficha;
}
