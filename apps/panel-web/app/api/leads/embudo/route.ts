import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadsResponse } from "@/lib/api/types";
import { consultaDeColumna, TARJETAS_POR_COLUMNA, tarjetaDeFila } from "@/lib/embudo";
import { ordenValido } from "@/lib/clientes";

/** Tamaño de página que se pide a la API (su máximo). */
const PAGINA_DE_LA_API = 100;
const CLAVE = /^[a-z_]{1,40}$/;
const VALOR = /^[a-z0-9_]{1,40}$/;

/**
 * BFF del «Ver más» del tablero de embudo (HU-CRM-24): la página siguiente de una columna con los mismos
 * filtros de la vista. Devuelve las tarjetas ya armadas, no las filas completas de la API.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const agente = url.searchParams.get("agente") ?? "";
  const etapa = url.searchParams.get("clave") ?? "";
  const valor = url.searchParams.get("valor") ?? "";
  const crudo = url.searchParams.get("desde") ?? "";
  const desde = Number(crudo);
  if (!CLAVE.test(agente) || !CLAVE.test(etapa) || !VALOR.test(valor) || !/^\d{1,6}$/.test(crudo)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const pedir = (pagina: number) =>
    apiFetch<LeadsResponse>(
      `/admin/leads?${consultaDeColumna({
        agente,
        q: url.searchParams.get("q") ?? undefined,
        filtros: url.searchParams.getAll("filtro"),
        orden: ordenValido(url.searchParams.get("orden") ?? undefined),
        etapa,
        valor,
        pagina,
        tamano: PAGINA_DE_LA_API,
      }).toString()}`,
    );

  // La API pagina de a PAGINA_DE_LA_API y las tarjetas se piden desde una posición cualquiera: se leen las
  // páginas que la cubren (una o dos) y se recorta.
  const primera = Math.floor(desde / PAGINA_DE_LA_API) + 1;
  const resto = desde % PAGINA_DE_LA_API;
  const res = await pedir(primera);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  let filas = res.data.items;
  if (resto + TARJETAS_POR_COLUMNA > PAGINA_DE_LA_API && res.data.has_more) {
    const siguiente = await pedir(primera + 1);
    if (!siguiente.ok) return NextResponse.json({ error: siguiente.error }, { status: siguiente.status });
    filas = [...filas, ...siguiente.data.items];
  }
  const tomadas = filas.slice(resto, resto + TARJETAS_POR_COLUMNA);
  return NextResponse.json({
    tarjetas: tomadas.map((fila) => tarjetaDeFila(fila, agente)),
    hay_mas: desde + tomadas.length < res.data.total,
  });
}
