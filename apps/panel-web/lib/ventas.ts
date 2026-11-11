/**
 * Ventas en palabras (rediseño A): pedidos, productos, promociones y categorías como los diría el
 * dueño («Hoy, 5:30 p. m.», «3 variantes · 15 en stock», «19 % en Ropa · del 20 al 21 de nov.»).
 * Lógica pura: las páginas solo pintan lo que devuelve.
 */

import { formatNumber } from "@/lib/format";

export type TonoVenta = "neutral" | "info" | "success" | "warning" | "danger";
export type Etiqueta = { label: string; tono: TonoVenta };

// ------------------------------------------------------------------ fechas

const HORA = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** «7 nov.», con el año solo si no es el de `ahora`. */
function diaCorto(fecha: Date, ahora: Date): string {
  const base = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === ahora.getFullYear() ? base : `${base} ${fecha.getFullYear()}`;
}

/** Cuándo pasó algo (VEN-05): «Hoy, 5:30 p. m.», «Ayer, 3:30 p. m.», «7 nov.». */
export function cuandoFue(valor: string | Date | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / 86_400_000);
  if (dias === 0) return `Hoy, ${HORA.format(fecha)}`;
  if (dias === 1) return `Ayer, ${HORA.format(fecha)}`;
  return diaCorto(fecha, ahora);
}

/**
 * Día guardado de una promoción. Se lee la fecha tal como viene (`2026-11-20T00:00:00Z` es el 20),
 * igual que el formulario la escribe: así la lista y el editor dicen el mismo día.
 */
export function diaGuardado(valor: string | null | undefined): Date | null {
  const m = valor ? /^(\d{4})-(\d{2})-(\d{2})/.exec(valor) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// ------------------------------------------------------------------ pedidos

/** Estado del pedido en palabras (VEN-03). `abierto` es lo que falta despachar. */
export const ESTADO_DE_PEDIDO: Record<string, Etiqueta> = {
  abierto: { label: "Por despachar", tono: "info" },
  despachado: { label: "En camino", tono: "neutral" },
  entregado: { label: "Entregado", tono: "success" },
  cancelado: { label: "Cancelado", tono: "neutral" },
  expirado: { label: "Venció", tono: "neutral" },
};

export function estadoDePedido(estado: string): Etiqueta {
  return ESTADO_DE_PEDIDO[estado] ?? { label: "Sin estado", tono: "neutral" };
}

/** El pago se lee por su palabra y su color (VEN-04); lo desconocido no se muestra crudo. */
export function pagoDePedido(estado: string | null | undefined): Etiqueta {
  switch (estado) {
    case "pagado":
      return { label: "Pagado", tono: "success" };
    case "pendiente":
      return { label: "Pago pendiente", tono: "warning" };
    case "rechazado":
      return { label: "Pago rechazado", tono: "danger" };
    default:
      return { label: "Sin dato de pago", tono: "neutral" };
  }
}

export type CambioDeEstado = { estado: string; label: string; destructivo?: boolean };

const PASAR_A: Record<string, CambioDeEstado> = {
  abierto: { estado: "abierto", label: "Volver a por despachar" },
  despachado: { estado: "despachado", label: "Marcar como despachado" },
  entregado: { estado: "entregado", label: "Marcar como entregado" },
  cancelado: { estado: "cancelado", label: "Cancelar el pedido", destructivo: true },
  expirado: { estado: "expirado", label: "Marcar como vencido" },
};

const SIGUIENTE: Record<string, string> = { abierto: "despachado", despachado: "entregado" };

/** El paso que sigue (el botón principal del pedido); un pedido cerrado no tiene. */
export function siguientePaso(estado: string): CambioDeEstado | null {
  const siguiente = SIGUIENTE[estado];
  return siguiente ? PASAR_A[siguiente] : null;
}

/** Los demás cambios, para «Más acciones»: todo menos el estado actual y el paso siguiente. */
export function otrosCambios(estado: string): CambioDeEstado[] {
  const siguiente = SIGUIENTE[estado];
  return Object.values(PASAR_A).filter((c) => c.estado !== estado && c.estado !== siguiente);
}

const METODO_DE_PAGO: Record<string, string> = {
  efectivo_contraentrega: "Efectivo al entregar",
  transferencia: "Transferencia",
  pago_en_linea: "Pago en línea",
};

const ENTREGA: Record<string, string> = {
  domicilio: "A domicilio",
  recoger_en_tienda: "Recoge en la tienda",
};

/** «Pago en línea», «Transferencia»; un método que no conocemos, sin nombre técnico. */
export function metodoDePago(metodo: string | null | undefined): string {
  return (metodo && METODO_DE_PAGO[metodo]) || "Otro medio de pago";
}

/** «A domicilio», «Recoge en la tienda». */
export function formaDeEntrega(metodo: string | null | undefined): string {
  return (metodo && ENTREGA[metodo]) || "Entrega por acordar";
}

type Linea = { name: string; quantity: number; unit_price: number };

/** «Jean clásico 30 y 2 más», «2 × Gorra bordada». */
export function productosDelPedido(lineas: readonly Linea[]): string {
  if (lineas.length === 0) return "Sin productos";
  const [primera] = lineas;
  const nombre = primera.quantity > 1 ? `${primera.quantity} × ${primera.name}` : primera.name;
  return lineas.length === 1 ? nombre : `${nombre} y ${lineas.length - 1} más`;
}

/** Columnas del tablero por etapa (VEN-03, vista «Por etapa»): solo por estado del pedido. */
export const ETAPAS: readonly { estado: string; titulo: string; vacio: string }[] = [
  { estado: "abierto", titulo: "Por despachar", vacio: "Nada por despachar." },
  { estado: "despachado", titulo: "En camino", vacio: "Nada en camino." },
  { estado: "entregado", titulo: "Entregados", vacio: "Aún no hay entregas." },
];

/** Lo vendido en el mes de `ahora`: pedidos pagados que no se cancelaron. */
export function vendidoEnElMes<T extends { total: number; payment_status: string; status: string; created_at?: string | null }>(
  pedidos: readonly T[],
  ahora: Date = new Date(),
): { total: number; pedidos: number } {
  const delMes = pedidos.filter((p) => {
    if (!p.created_at || p.payment_status !== "pagado" || p.status === "cancelado") return false;
    const f = new Date(p.created_at);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  });
  return { total: delMes.reduce((suma, p) => suma + p.total, 0), pedidos: delMes.length };
}

// ------------------------------------------------------------------ productos

export type Variante = { sku: string; attributes: Record<string, unknown>; price: number; stock: number; active: boolean };

/** Quedan pocas: a partir de aquí se avisa en ámbar. */
export const POCAS_UNIDADES = 3;

/** «S · Negro»; sin atributos, «Única». */
export function nombreDeVariante(atributos: Record<string, unknown> | null | undefined): string {
  const valores = Object.values(atributos ?? {})
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map((v) => String(v).trim())
    .filter(Boolean);
  return valores.length ? valores.join(" · ") : "Única";
}

/**
 * El inventario de un producto en palabras (VEN-06): «3 variantes · 15 en stock» y, si hace falta,
 * un aviso («1 variante agotada», «Quedan 3», «Agotado»). Las variantes apagadas no cuentan.
 */
export function inventarioEnPalabras(variantes: readonly Pick<Variante, "stock" | "active">[]): { texto: string; aviso: Etiqueta | null } {
  const activas = variantes.filter((v) => v.active);
  if (activas.length === 0) return { texto: "Sin variantes a la venta", aviso: { label: "No se ofrece", tono: "neutral" } };
  const stock = activas.reduce((suma, v) => suma + Math.max(0, v.stock), 0);
  const texto = activas.length === 1 ? `${formatNumber(stock)} en stock` : `${activas.length} variantes · ${formatNumber(stock)} en stock`;
  if (stock === 0) return { texto, aviso: { label: "Agotado", tono: "danger" } };
  const agotadas = activas.filter((v) => v.stock <= 0).length;
  if (agotadas > 0) {
    return { texto, aviso: { label: agotadas === 1 ? "1 variante agotada" : `${agotadas} variantes agotadas`, tono: "warning" } };
  }
  if (stock <= POCAS_UNIDADES) return { texto, aviso: { label: `Quedan ${stock}`, tono: "warning" } };
  return { texto, aviso: null };
}

/** Variantes agotadas del catálogo (para el resumen): cuántas y el nombre de la primera. */
export function agotadas(
  productos: readonly { name: string; variants: readonly Pick<Variante, "stock" | "active" | "attributes">[] }[],
): { variantes: number; ejemplo: string | null } {
  let variantes = 0;
  let ejemplo: string | null = null;
  for (const p of productos) {
    for (const v of p.variants) {
      if (!v.active || v.stock > 0) continue;
      variantes += 1;
      if (!ejemplo) {
        const nombre = nombreDeVariante(v.attributes);
        ejemplo = nombre === "Única" ? p.name : `${p.name} ${nombre}`;
      }
    }
  }
  return { variantes, ejemplo };
}

// ------------------------------------------------------------------ promociones

export type PromoVenta = {
  type: string;
  rules: Record<string, unknown>;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  category_id: string | null;
  product_id: string | null;
  ally_id?: string | null;
  include_child_categories: boolean;
  eligible_segments: string[] | null;
};

const SEGMENTO: Record<string, string> = {
  nuevo: "nuevos",
  ocasional: "ocasionales",
  frecuente: "frecuentes",
  fiel: "fieles",
  inactivo: "inactivos",
};

const pct = (n: unknown) => `${formatNumber(Number(n))} %`;

type Escalon = { min?: unknown; discount_pct?: unknown; free_item_sku?: unknown };

/** «19 %», «10 % desde 3 unidades, 15 % desde 6», «CAM-01 de regalo desde 4 unidades». */
export function beneficioEnPalabras(reglas: Record<string, unknown>): string {
  const escalones = Array.isArray(reglas.tiers) ? (reglas.tiers as Escalon[]) : [];
  if (escalones.length > 0) {
    return escalones
      .map((t, i) => {
        const premio = t.discount_pct ? pct(t.discount_pct) : `${String(t.free_item_sku ?? "un producto")} de regalo`;
        return `${premio} desde ${formatNumber(Number(t.min ?? 1))}${i === 0 ? " unidades" : ""}`;
      })
      .join(", ");
  }
  if (reglas.discount_pct !== undefined && reglas.discount_pct !== null) return pct(reglas.discount_pct);
  return "Sin beneficio";
}

/** El mayor descuento que puede dar (para ordenar y para la etiqueta de la vitrina). */
export function mayorDescuento(reglas: Record<string, unknown>): number {
  const escalones = Array.isArray(reglas.tiers) ? (reglas.tiers as Escalon[]) : [];
  const valores = escalones.length ? escalones.map((t) => Number(t.discount_pct ?? 0)) : [Number(reglas.discount_pct ?? 0)];
  return Math.max(0, ...valores.filter((n) => Number.isFinite(n)));
}

/** «del 20 al 21 de nov.», «desde el 20 de nov.», «hasta el 21 de nov.» o «siempre». */
export function vigenciaEnPalabras(desde: string | null, hasta: string | null, ahora: Date = new Date()): string {
  const a = diaGuardado(desde);
  const b = diaGuardado(hasta);
  if (!a && !b) return "siempre";
  if (a && !b) return `desde el ${diaCorto(a, ahora)}`;
  if (!a && b) return `hasta el ${diaCorto(b, ahora)}`;
  if (a!.getTime() === b!.getTime()) return `el ${diaCorto(a!, ahora)}`;
  if (a!.getFullYear() === b!.getFullYear() && a!.getMonth() === b!.getMonth()) {
    return `del ${a!.getDate()} al ${diaCorto(b!, ahora).replace(/^\d+ /, (d) => `${d}de `)}`;
  }
  return `del ${diaCorto(a!, ahora)} al ${diaCorto(b!, ahora)}`;
}

/** «para clientes nuevos y frecuentes»; sin segmentos, vacío (todos). */
export function paraQuienEnPalabras(segmentos: readonly string[] | null | undefined): string {
  const nombres = (segmentos ?? []).map((s) => SEGMENTO[s] ?? s);
  if (nombres.length === 0) return "";
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
  return `para clientes ${lista}`;
}

export type NombresDeVentas = {
  categorias: ReadonlyMap<string, string>;
  productos: ReadonlyMap<string, string>;
  aliados?: ReadonlyMap<string, string>;
};

/** «en toda la tienda», «en Ropa», «en Camiseta básica», con «de <aliado>» si se limita a uno. */
export function alcanceEnPalabras(p: Pick<PromoVenta, "category_id" | "product_id" | "ally_id">, nombres: NombresDeVentas): string {
  const base = p.product_id
    ? `en ${nombres.productos.get(p.product_id) ?? "un producto que ya no está"}`
    : p.category_id
      ? `en ${nombres.categorias.get(p.category_id) ?? "una categoría que ya no está"}`
      : "en toda la tienda";
  if (!p.ally_id) return base;
  return `${base}, solo de ${nombres.aliados?.get(p.ally_id) ?? "un aliado eliminado"}`;
}

/** La promoción como frase (VEN-11): «19 % en Ropa · del 20 al 21 de nov. · para clientes nuevos». */
export function promoEnPalabras(p: PromoVenta, nombres: NombresDeVentas, ahora: Date = new Date()): string {
  const para = paraQuienEnPalabras(p.eligible_segments);
  return [`${beneficioEnPalabras(p.rules)} ${alcanceEnPalabras(p, nombres)}`, vigenciaEnPalabras(p.valid_from, p.valid_to, ahora), para]
    .filter(Boolean)
    .join(" · ");
}

/** Un solo estado por promoción: el interruptor ya dice si está encendida. */
export function estadoDePromo(p: Pick<PromoVenta, "active" | "valid_from" | "valid_to">, ahora: Date = new Date()): Etiqueta {
  if (!p.active) return { label: "Apagada", tono: "neutral" };
  const desde = p.valid_from ? new Date(p.valid_from) : null;
  const hasta = p.valid_to ? new Date(p.valid_to) : null;
  if (hasta && hasta.getTime() < ahora.getTime()) return { label: "Terminó", tono: "neutral" };
  if (desde && desde.getTime() > ahora.getTime()) {
    const dias = Math.round((inicioDelDia(desde) - inicioDelDia(ahora)) / 86_400_000);
    return { label: dias <= 1 ? "Empieza mañana" : `Empieza en ${dias} días`, tono: "info" };
  }
  return { label: "Activa", tono: "success" };
}

function vigente(p: PromoVenta, ahora: Date): boolean {
  return estadoDePromo(p, ahora).label === "Activa";
}

/**
 * La promoción que hoy se le ofrece a todos en un producto (la vitrina la muestra): vigente, sin
 * segmentos y que lo alcanza por producto, categoría (con sus subcategorías si así se guardó) o
 * tienda; con aliado, solo si es el del producto. Si hay varias, la de mayor descuento.
 */
export function promoDelProducto<P extends PromoVenta>(
  producto: { id: string; category_id: string | null; ally_id?: string | null },
  promos: readonly P[],
  categorias: readonly { id: string; parent_id: string | null }[],
  ahora: Date = new Date(),
): P | null {
  const padre = new Map(categorias.map((c) => [c.id, c.parent_id]));
  const ancestros = new Set<string>();
  for (let c = producto.category_id ? padre.get(producto.category_id) : null; c && !ancestros.has(c); c = padre.get(c) ?? null) {
    ancestros.add(c);
  }
  const alcanza = (p: P) => {
    if (p.ally_id && p.ally_id !== producto.ally_id) return false;
    if (p.product_id) return p.product_id === producto.id;
    if (p.category_id) return p.category_id === producto.category_id || (p.include_child_categories && ancestros.has(p.category_id));
    return true;
  };
  const candidatas = promos.filter((p) => vigente(p, ahora) && !(p.eligible_segments?.length) && alcanza(p));
  return candidatas.sort((a, b) => mayorDescuento(b.rules) - mayorDescuento(a.rules))[0] ?? null;
}

/** «19 % · Día sin IVA»; con escalones, «Hasta 15 % · Lleva más, paga menos». */
export function etiquetaDePromo(p: PromoVenta): string {
  const nombre = String(p.rules.label ?? "").trim();
  const max = mayorDescuento(p.rules);
  const cuanto = Array.isArray(p.rules.tiers) && p.rules.tiers.length > 1 ? `Hasta ${pct(max)}` : max > 0 ? pct(max) : "Regalo";
  return nombre ? `${cuanto} · ${nombre}` : cuanto;
}

// ------------------------------------------------------------------ categorías

export type Categoria = { id: string; name: string; parent_id: string | null; sort_order: number; active: boolean };

export type NodoDeCategoria<C extends Categoria> = {
  categoria: C;
  nivel: number;
  /** Productos de la categoría y de sus subcategorías. */
  productos: number;
  /** Hermanas vecinas en el orden, para subir y bajar. */
  anterior: C | null;
  siguiente: C | null;
};

/**
 * Categorías como árbol (VEN-10): cada una bajo su madre, en su orden, con cuántos productos tiene
 * contando las subcategorías. Una categoría cuya madre no está queda en la raíz.
 */
export function arbolDeCategorias<C extends Categoria>(
  categorias: readonly C[],
  productos: readonly { category_id: string | null }[],
): NodoDeCategoria<C>[] {
  const ids = new Set(categorias.map((c) => c.id));
  const raiz = (c: C) => !c.parent_id || !ids.has(c.parent_id) || c.parent_id === c.id;
  const hijas = new Map<string | null, C[]>();
  for (const c of categorias) {
    const clave = raiz(c) ? null : c.parent_id;
    hijas.set(clave, [...(hijas.get(clave) ?? []), c]);
  }
  for (const lista of hijas.values()) {
    lista.sort((a, b) => Number(b.active) - Number(a.active) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  }
  const directos = new Map<string, number>();
  for (const p of productos) if (p.category_id) directos.set(p.category_id, (directos.get(p.category_id) ?? 0) + 1);

  const salida: NodoDeCategoria<C>[] = [];
  const vistas = new Set<string>();
  const total = (id: string, camino: Set<string>): number =>
    (directos.get(id) ?? 0) + (hijas.get(id) ?? []).filter((h) => !camino.has(h.id)).reduce((s, h) => s + total(h.id, new Set([...camino, h.id])), 0);
  const recorrer = (padre: string | null, nivel: number) => {
    const lista = hijas.get(padre) ?? [];
    lista.forEach((c, i) => {
      if (vistas.has(c.id)) return;
      vistas.add(c.id);
      salida.push({ categoria: c, nivel, productos: total(c.id, new Set([c.id])), anterior: lista[i - 1] ?? null, siguiente: lista[i + 1] ?? null });
      recorrer(c.id, nivel + 1);
    });
  };
  recorrer(null, 0);
  return salida;
}

/** La categoría y todas sus subcategorías (para filtrar «Ver sus productos»). */
export function conSubcategorias(id: string, categorias: readonly { id: string; parent_id: string | null }[]): Set<string> {
  const ids = new Set([id]);
  for (let crecio = true; crecio; ) {
    crecio = false;
    for (const c of categorias) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        crecio = true;
      }
    }
  }
  return ids;
}

/** «1 producto», «5 productos», «Sin productos». */
export function cuantosProductos(n: number): string {
  if (n === 0) return "Sin productos";
  return n === 1 ? "1 producto" : `${formatNumber(n)} productos`;
}

// ------------------------------------------------------------------ productos: filtros y vista

export type FiltrosProductos = { aliado?: string; categoria?: string; q?: string; vista?: string; producto?: string };

/** Query de `/comercio/productos` que conserva filtros, vista y ficha abierta. */
export function hrefProductos(f: FiltrosProductos): string {
  const qs = new URLSearchParams();
  if (f.aliado) qs.set("aliado", f.aliado);
  if (f.categoria) qs.set("categoria", f.categoria);
  if (f.q?.trim()) qs.set("q", f.q.trim());
  if (f.vista) qs.set("vista", f.vista);
  if (f.producto) qs.set("producto", f.producto);
  return `/comercio/productos${qs.size ? `?${qs.toString()}` : ""}`;
}

/** Busca sin tildes ni mayúsculas: «camiseta» encuentra «Camiseta básica». */
export function coincide(texto: string, busqueda: string): boolean {
  const limpio = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return limpio(texto).includes(limpio(busqueda.trim()));
}

/** Editor de una categoría (`nueva` para crearla), conservando la vista. */
export function hrefCategoria(id: string, vista = ""): string {
  const qs = new URLSearchParams({ categoria: id });
  if (vista) qs.set("vista", vista);
  return `/comercio/categorias?${qs.toString()}`;
}

/** Editor de un aliado (`nuevo` para crearlo). */
export function hrefAliado(id: string): string {
  return `/comercio/aliados?aliado=${encodeURIComponent(id)}`;
}
