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
