/**
 * Pedidos del pack de Comercio (HU-CRM-20): estados en español, estado del pago y la consulta a
 * `GET /pack/commerce/orders` a partir de los filtros de la URL.
 */

/** Estados de un pedido (`ORDER_STATUSES` del backend) con su nombre en español, en orden de ciclo. */
export const ESTADOS_DE_PEDIDO: Record<string, string> = {
  abierto: "Abierto",
  despachado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

export const ESTADOS_DE_PAGO: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  rechazado: "Rechazado",
};

export function etiquetaDeEstado(estado: string): string {
  return ESTADOS_DE_PEDIDO[estado] ?? estado;
}

export function etiquetaDePago(estado: string): string {
  return ESTADOS_DE_PAGO[estado] ?? estado;
}

export const PEDIDOS_POR_PAGINA = 25;

export type FiltrosPedidos = {
  estado?: string;
  /** Estado del pago (`pagado`, `pendiente`, `rechazado`). */
  pago?: string;
  q?: string;
  /** Id del cliente (viene de «Ver sus pedidos» en su ficha). */
  cliente?: string;
  page?: string;
};

/** Número de página de la URL (≥ 1; lo inválido vale 1). */
export function paginaDe(page: string | undefined): number {
  const n = Number.parseInt(page ?? "", 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Filtros de la URL sin los inválidos: el estado debe ser uno del catálogo. */
export function filtrosLimpios(sp: FiltrosPedidos): Required<Omit<FiltrosPedidos, "page">> {
  return {
    estado: sp.estado && sp.estado in ESTADOS_DE_PEDIDO ? sp.estado : "",
    pago: sp.pago && sp.pago in ESTADOS_DE_PAGO ? sp.pago : "",
    q: sp.q?.trim() ?? "",
    cliente: sp.cliente?.trim() ?? "",
  };
}

/** Query de la API de pedidos: filtros más `limit`/`offset` de la página pedida. */
export function consultaPedidos(sp: FiltrosPedidos): URLSearchParams {
  const { estado, pago, q, cliente } = filtrosLimpios(sp);
  const qs = new URLSearchParams();
  if (estado) qs.set("estado", estado);
  if (pago) qs.set("pago", pago);
  if (q) qs.set("q", q);
  if (cliente) qs.set("customer_id", cliente);
  qs.set("limit", String(PEDIDOS_POR_PAGINA));
  qs.set("offset", String((paginaDe(sp.page) - 1) * PEDIDOS_POR_PAGINA));
  return qs;
}

/** Query de la página `/comercio/pedidos` con los filtros vigentes (sin `page`) y la página pedida. */
export function hrefPedidos(sp: FiltrosPedidos, page = 1): string {
  const { estado, pago, q, cliente } = filtrosLimpios(sp);
  const qs = new URLSearchParams();
  if (estado) qs.set("estado", estado);
  if (pago) qs.set("pago", pago);
  if (q) qs.set("q", q);
  if (cliente) qs.set("cliente", cliente);
  if (page > 1) qs.set("page", String(page));
  return `/comercio/pedidos${qs.size ? `?${qs.toString()}` : ""}`;
}
