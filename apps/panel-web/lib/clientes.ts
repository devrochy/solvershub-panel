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
  /** Pestaña del agente que se abre en la ficha (`ventas`, `cobranza`, `agenda`…). */
  agente?: string;
  /** Abre la ficha directamente en modo edición (`1`). */
  editar?: string;
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
  if (linkKind === "appointment") return "/calendario";
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
  cobro: "Cobro",
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

export const CLASIFICACION: Record<string, string> = {
  nuevo: "Nuevo",
  prospecto: "Prospecto",
  cliente: "Cliente",
  vip: "VIP",
  inactivo: "Inactivo",
  bloqueado: "Bloqueado",
};

export const TIPO_DOCUMENTO: Record<string, string> = {
  cc: "Cédula de ciudadanía",
  ce: "Cédula de extranjería",
  nit: "NIT",
  pasaporte: "Pasaporte",
  otro: "Otro",
};

/** Claves que ya se muestran en la pestaña General; no se repiten en «otros datos». */
const CLAVES_DEL_PERFIL = new Set([
  "name", "nombre", "full_name", "apellido", "alias", "avatar_url", "foto",
  "phone", "telefono", "contact_phone", "pais_telefono",
  "email", "correo", "tipo_documento", "id_document", "documento", "cedula",
  "address", "direccion", "municipio", "municipality", "ciudad", "city",
  "departamento", "department", "estado", "pais", "country",
  "latitud", "lat", "latitude", "longitud", "lng", "lon", "longitude",
  "clasificacion", "clasificación",
]);

/** `true` si la clave ya es un dato del perfil (incluye alias viejos como `full_name`). */
export function esClaveDelPerfil(clave: string): boolean {
  return CLAVES_DEL_PERFIL.has(normalizarClave(clave));
}

export function etiquetaClasificacion(valor?: string | null, label?: string | null): string {
  return label || (valor ? CLASIFICACION[valor] ?? valor : "Sin clasificar");
}

export function etiquetaTipoDocumento(valor?: string | null): string {
  return valor ? TIPO_DOCUMENTO[valor] ?? valor : "—";
}

type Telefono = {
  phone?: string | null;
  phone_e164?: string | null;
  phone_indicativo?: string | null;
  phone_local?: string | null;
};

export function telefonoVisible(perfil: Telefono): string {
  if (perfil.phone_indicativo && perfil.phone_local) {
    return `${perfil.phone_indicativo} ${perfil.phone_local}`;
  }
  return perfil.phone_e164 || perfil.phone || "—";
}

type Ubicacion = {
  address?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  pais?: string | null;
};

export function ubicacionVisible(perfil: Ubicacion): string {
  const municipio = [perfil.municipio, perfil.departamento].filter(Boolean).join(", ");
  return municipio || perfil.address || perfil.pais || "—";
}

/** Datos que el agente guardó en otros namespaces: se muestran aparte del perfil canónico. */
export function datosFueraDelPerfil<T extends { namespace: string; key: string }>(datos: T[]): T[] {
  return datos.filter((d) => d.namespace !== "perfil" || !CLAVES_DEL_PERFIL.has(d.key));
}

// ── Ventas › Clientes operable (HU-CRM-17) ──────────────────────────────────────────────────────

/** Máximo de filas del CSV (`MAX_CSV` del backend): pasado ese total el panel avisa que se trunca. */
export const MAX_FILAS_CSV = 5000;

/** Órdenes de la lista (`orden=` de `/admin/leads`); `alta` es el valor por defecto de la API. */
export const ORDENES_CLIENTES = [
  { value: "alta", label: "Más nuevos primero" },
  { value: "actividad", label: "Última actividad" },
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "nombre_desc", label: "Nombre (Z–A)" },
] as const;

export type OrdenClientes = (typeof ORDENES_CLIENTES)[number]["value"];

/** El `orden` de la URL si la API lo conoce; cualquier otro valor se descarta (la API respondería 422). */
export function ordenValido(valor: string | undefined): OrdenClientes | null {
  return ORDENES_CLIENTES.find((o) => o.value === valor)?.value ?? null;
}

/** Solo dígitos del teléfono del cliente (con indicativo si el perfil lo trae), o "" si no hay uno usable. */
function digitosDelTelefono(perfil: Telefono): string {
  const digitos = soloDigitos(perfil.phone_e164 || perfil.phone || `${perfil.phone_indicativo ?? ""}${perfil.phone_local ?? ""}`);
  return digitos.length >= 7 ? digitos : "";
}

/** `tel:` para llamar al cliente; null si no tiene teléfono (la acción se oculta, no se deshabilita). */
export function enlaceTelefono(perfil: Telefono): string | null {
  const digitos = digitosDelTelefono(perfil);
  return digitos ? `tel:+${digitos}` : null;
}

/** `wa.me` para escribirle al cliente por WhatsApp; null si no tiene teléfono. Mismo criterio que la APK. */
export function enlaceWhatsApp(perfil: Telefono): string | null {
  const digitos = digitosDelTelefono(perfil);
  return digitos ? `https://wa.me/${digitos}` : null;
}

/** Quién puede enviar plantillas desde la lista: el propietario del negocio, la plataforma y el tester (D-SPEC-33-8). */
export function puedeEnviarPlantilla(me: { role?: string | null; tenant?: { role?: string | null } | null } | null | undefined): boolean {
  return Boolean(me && (me.role === "master" || me.role === "tester" || me.tenant?.role === "owner"));
}

/** «Hace 3 min», «Hace 2 h», «Hace 5 días» o la fecha si pasó más de un mes; «Sin mensajes» si nunca escribió. */
export function textoDeActividad(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return "Sin mensajes";
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ayer";
  if (dias < 31) return `Hace ${dias} días`;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(iso));
}

export type PestanaDeEtapa = { value: string; label: string; count: number };

/**
 * Pestañas de un filtro del pack con su contador (`facetas=` de la API): «Todas» más una por opción
 * declarada, en el orden del pack. Los clientes sin valor (sin lead de venta) no son una pestaña: no
 * hay filtro que los seleccione, así que se devuelven aparte.
 */
export function pestanasDeFaceta(
  filtro: { options: { value: string; label: string }[] },
  faceta: { counts: Record<string, number>; sin_valor: number; total: number } | undefined,
): { pestanas: PestanaDeEtapa[]; sinValor: number } {
  const contar = (v: string) => faceta?.counts[v] ?? 0;
  return {
    pestanas: [
      { value: "", label: "Todas", count: faceta?.total ?? 0 },
      ...filtro.options.map((o) => ({ value: o.value, label: o.label, count: contar(o.value) })),
    ],
    sinValor: faceta?.sin_valor ?? 0,
  };
}

/** `filtro` de la URL con la clave `clave` cambiada (valor vacío = quitarla), conservando los demás. */
export function filtrosCon(filtro: string | string[] | undefined, clave: string, valor: string): string[] {
  const otros = filtrosDePacks(filtro).filter((f) => !f.startsWith(`${clave}:`));
  return valor ? [...otros, `${clave}:${valor}`] : otros;
}

/**
 * Enlace a la ficha de un cliente: la lista de Clientes con la ficha abierta (`/leads?cliente=`).
 * `agente` abre la pestaña de ese agente (`ventas`…), `editar` abre el modo edición y `qs` conserva
 * los filtros de la lista desde la que se abre. Sin `id` devuelve la lista (ficha cerrada).
 */
export function hrefFicha(
  id?: string,
  { agente, editar = false, qs }: { agente?: string; editar?: boolean; qs?: URLSearchParams } = {},
): string {
  const next = new URLSearchParams(qs);
  if (id) next.set("cliente", id);
  else next.delete("cliente");
  if (id && agente) next.set("agente", agente);
  else next.delete("agente");
  if (id && editar) next.set("editar", "1");
  else next.delete("editar");
  return `/leads${next.size ? `?${next.toString()}` : ""}`;
}

/**
 * ¿La sesión puede abrir la ficha de un cliente? La ficha vive en la sección Clientes (`leads`, ADR-0047):
 * un colaborador de Comercio o de Escalaciones sin ella no ve el nombre como enlace.
 */
export function puedeVerClientes(sesion: { permissions?: Record<string, unknown> | null } | null | undefined): boolean {
  return Boolean(sesion?.permissions?.leads);
}
