import type { DestinoResumen } from "@/lib/api/types";

/**
 * Del destino lógico del backend (`ruta` + `params`) a la URL del panel (ADR-0171).
 *
 * El backend no conoce nuestras URLs: manda `comercio.pedidos`, no `/comercio/pedidos`. Aquí
 * vive la tabla. Solo se pasan los filtros que la pantalla destino lee de la URL; los demás se
 * ignoran (la tarjeta lleva a la lista sin filtrar). Un destino desconocido devuelve `undefined`:
 * la tarjeta se muestra sin enlace en vez de romper.
 */

/** Lo que el Resumen enlaza de `/agentes/[id]` (AGT-04): las tareas viven en Actividad, el consumo en su pestaña. */
const PESTANAS_DE_AGENTE: Record<string, string> = { tareas: "?ver=tareas", consumo: "?tab=consumo" };

function conFiltros(base: string, params: Record<string, string>, permitidos: readonly string[]): string {
  const qs = new URLSearchParams();
  for (const clave of permitidos) {
    const valor = params[clave];
    if (valor) qs.set(clave, valor);
  }
  const texto = qs.toString();
  return texto ? `${base}?${texto}` : base;
}

export function hrefDeDestino(destino: DestinoResumen | null | undefined): string | undefined {
  if (!destino) return undefined;
  const p = destino.params ?? {};
  switch (destino.ruta) {
    case "conversaciones":
      return "/conversaciones";
    case "escalaciones":
      return conFiltros("/escalaciones", p, ["estado"]);
    case "costos":
      return "/costos";
    case "agente": {
      const ref = p.ref;
      if (!ref) return undefined;
      const base = `/agentes/${encodeURIComponent(ref)}`;
      return `${base}${(p.pestana && PESTANAS_DE_AGENTE[p.pestana]) || ""}`;
    }
    case "comercio.pedidos":
      return conFiltros("/comercio/pedidos", p, ["estado", "pago"]);
    case "calendario.citas":
      return "/calendario";
    case "cobranza.pagos":
      return "/cobranza/pagos";
    case "cobranza.carteras":
      return "/cobranza/carteras";
    case "cobranza.promesas":
      return conFiltros("/cobranza/promesas", p, ["estado"]);
    case "suscripciones":
      return "/suscripciones";
    case "suscripciones.lista":
      return conFiltros("/suscripciones/lista", p, ["estado"]);
    case "suscripciones.pagos":
      return conFiltros("/suscripciones/pagos", p, ["vencidos"]);
    case "leads":
      return "/leads";
    default:
      return undefined;
  }
}
