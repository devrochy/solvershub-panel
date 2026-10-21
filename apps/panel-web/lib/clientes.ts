/**
 * Clientes (HU-UX-16): filtros de la lista y etiquetas de la ficha.
 *
 * Los filtros de los packs viajan como `filtro=clave:valor` (uno por pack); un `filtro` vacío
 * (opción «Todos» del select) se descarta antes de llamar a la API.
 */

export type FiltrosClientes = {
  q?: string;
  channel?: string;
  connection_id?: string;
  filtro?: string | string[];
  page?: string;
  cliente?: string;
};

/** Query de la API (`/admin/leads` y su `export.csv`) a partir de los filtros de la URL. */
export function consultaClientes(sp: FiltrosClientes, { conPagina = true } = {}): URLSearchParams {
  const qs = new URLSearchParams();
  if (sp.q?.trim()) qs.set("q", sp.q.trim());
  if (sp.channel) qs.set("channel", sp.channel);
  if (sp.connection_id) qs.set("connection_id", sp.connection_id);
  for (const f of filtrosDePacks(sp.filtro)) qs.append("filtro", f);
  if (conPagina && sp.page) qs.set("page", sp.page);
  return qs;
}

/** `filtro` de la URL como lista, sin vacíos ni valores sin `clave:valor`. */
export function filtrosDePacks(filtro: string | string[] | undefined): string[] {
  const lista = Array.isArray(filtro) ? filtro : filtro ? [filtro] : [];
  return lista.filter((f) => /^[a-z_]+:.+$/.test(f));
}

/** Valor elegido de un filtro de pack (`clasificacion` → `fiel`), o "". */
export function valorDeFiltro(filtro: string | string[] | undefined, clave: string): string {
  const encontrado = filtrosDePacks(filtro).find((f) => f.startsWith(`${clave}:`));
  return encontrado ? encontrado.slice(clave.length + 1) : "";
}

/**
 * Clasificación del filtro activo para crear una promoción desde Clientes (HU-CRM-06).
 * Una promoción solo se limita por clasificación (`eligible_segments` de pack_commerce), no por
 * canal, conexión ni estado del lead: sin `clasificacion` en el filtro devuelve null.
 */
export function segmentoDelFiltro(
  filtro: string | string[] | undefined,
  filtros: { key: string; options: { value: string; label: string }[] }[],
): { value: string; label: string } | null {
  const valor = valorDeFiltro(filtro, "clasificacion");
  if (!valor) return null;
  const opcion = filtros.find((f) => f.key === "clasificacion")?.options.find((o) => o.value === valor);
  return opcion ? { value: opcion.value, label: opcion.label } : null;
}

export const ORIGEN_DEL_DATO: Record<string, string> = {
  tool: "Asistente",
  agent: "Asistente",
  human: "Persona",
  import: "Importado",
};

export function origenDelDato(source: string): string {
  return ORIGEN_DEL_DATO[source] ?? source;
}

const DATO: Record<string, string> = {
  name: "Nombre",
  nombre: "Nombre",
  email: "Correo",
  correo: "Correo",
  telefono: "Teléfono",
  phone: "Teléfono",
  direccion: "Dirección",
  address: "Dirección",
  ciudad: "Ciudad",
  city: "Ciudad",
  municipio: "Municipio",
  barrio: "Barrio",
  documento: "Documento",
  cedula: "Cédula",
  nit: "NIT",
  empresa: "Empresa",
  cumpleanos: "Cumpleaños",
};

/** Etiqueta legible de la clave de un dato (`direccion_entrega` → «Direccion entrega»). */
export function etiquetaDeDato(clave: string): string {
  if (DATO[clave]) return DATO[clave];
  const texto = clave.replace(/[_.-]+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : clave;
}

/** Texto de un valor guardado (los hechos son JSON). */
export function textoDeDato(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Clave nueva escrita por una persona: minúsculas, sin tildes, con guion bajo. */
export function normalizarClave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

/** Ruta del panel a la que lleva un evento de la línea de tiempo, o null. */
export function enlaceDeEvento(linkKind?: string | null, linkId?: string | null): string | null {
  if (!linkKind || !linkId) return null;
  if (linkKind === "conversation") return `/conversaciones?c=${encodeURIComponent(linkId)}`;
  if (linkKind === "order") return "/comercio/pedidos";
  if (linkKind === "appointment") return "/calendario/citas";
  return null;
}

export const TIPO_DE_EVENTO: Record<string, string> = {
  conversacion: "Conversación",
  escalacion: "Escalación",
  dato: "Dato",
  nota: "Nota",
  cotizacion: "Cotización",
  pedido: "Pedido",
  cita: "Cita",
  plantilla: "Plantilla",
};

type ConPerfil = {
  telefono?: string | null;
  datos: { namespace: string; key: string; value: unknown }[];
};

const soloDigitos = (v: unknown) => String(v ?? "").replace(/\D+/g, "");

/** Mismo número con o sin indicativo de país (`+57 300…` y `300…`). */
export function mismoTelefono(a: unknown, b: unknown): boolean {
  const x = soloDigitos(a);
  const y = soloDigitos(b);
  if (x.length < 7 || y.length < 7) return false;
  return x.endsWith(y) || y.endsWith(x);
}

/**
 * Datos del perfil que se muestran en «Lo que sabemos» (ADR-0149): el nombre va en el título y el
 * teléfono del perfil solo si es distinto del teléfono del canal, para no mostrar el mismo dato dos veces.
 */
export function datosDelPerfil<T extends ConPerfil["datos"][number]>(detalle: { telefono?: string | null; datos: T[] }): T[] {
  return detalle.datos.filter(
    (d) => d.namespace === "perfil" && d.key !== "name" && !(d.key === "phone" && mismoTelefono(d.value, detalle.telefono)),
  );
}

/** Columnas de los packs que no se editan en la ficha (las editables se muestran en su sección). */
export function columnasDeSoloLectura<C extends { key: string }>(
  columns: C[],
  editables: { key: string }[] | undefined,
): C[] {
  const editables_ = new Set((editables ?? []).map((e) => e.key));
  return columns.filter((c) => !editables_.has(c.key));
}
