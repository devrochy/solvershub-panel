/**
 * Reportes de clientes (SPEC-54, ADR-0213, HU-FB-05): las reglas del formulario «Reportar un problema» y de
 * «Mis reportes» que no dependen de React. Los límites de los adjuntos vienen de `GET /feedback/catalogo`; los
 * de título y descripción son los del backend (3–120 y 10–2000).
 */
import type { FeedbackCatalogo, FeedbackLimites, FeedbackOpcion, FeedbackReporteResumen } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { seccionLabel } from "@/lib/labels";
import { itemDeRuta } from "@/lib/shell/sesion";

export type TipoDeReporte = FeedbackReporteResumen["tipo"];
export type EstadoDeReporte = FeedbackReporteResumen["estado"];
export type MotivoDeRechazo = NonNullable<FeedbackReporteResumen["motivo_codigo"]>;

export const TITULO_MIN = 3;
export const TITULO_MAX = 120;
export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 2000;

/** El menú del avatar lo emite y el host del formulario, montado una vez en el layout, lo escucha. */
export const EVENTO_REPORTAR = "sh:reportar-problema";

export const ESTADOS_DE_REPORTE: Record<EstadoDeReporte, { label: string; variant: "neutral" | "accent" | "success" | "danger" }> = {
  recibido: { label: "Recibido", variant: "neutral" },
  en_revision: { label: "En revisión", variant: "accent" },
  aprobado: { label: "Aprobado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "danger" },
};

export const TIPOS_DE_REPORTE: Record<TipoDeReporte, string> = { error: "Error", mejora: "Mejora", idea: "Idea" };

/** Ayuda de cada tipo en el formulario: qué esperamos leer. */
export const AYUDA_DEL_TIPO: Record<TipoDeReporte, string> = {
  error: "Algo no funciona como debería.",
  mejora: "Algo que ya existe y podría ser mejor.",
  idea: "Algo que todavía no existe.",
};

export const MOTIVOS_DE_RECHAZO: Record<MotivoDeRechazo, string> = {
  duplicado: "Ya lo habían reportado",
  no_reproducible: "No lo pudimos reproducir",
  fuera_de_alcance: "Fuera de lo que hace SolversHub",
  informacion_insuficiente: "Faltó información",
  otro: "Otro motivo",
};

/** Clave de idempotencia de un envío: una por apertura del formulario, la misma en sus reintentos. */
export function claveDeEnvio(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** «Cobranza · Clientes» y no solo «Clientes»: una sección de un pack lleva el pack delante. */
function etiquetaDeArea(clave: string): string {
  const etiqueta = seccionLabel(clave);
  const pack = /^(pack_[a-z]+):/.exec(clave)?.[1];
  if (!pack) return etiqueta;
  const nombre = seccionLabel(pack);
  return etiqueta.includes(" · ") || etiqueta === nombre ? etiqueta : `${nombre} · ${etiqueta}`;
}

/**
 * Las áreas del catálogo con el nombre que usa el panel (el del menú: «Resumen», «Habilidades»), en orden
 * alfabético y con «Otra» al final. La API da la clave de permiso, a veces sin etiqueta propia.
 */
export function areasDelCatalogo(catalogo: Pick<FeedbackCatalogo, "areas">): FeedbackOpcion[] {
  const otra = catalogo.areas.filter((a) => a.clave === "otra");
  const resto = catalogo.areas
    .filter((a) => a.clave !== "otra")
    .map((a) => ({ clave: a.clave, etiqueta: etiquetaDeArea(a.clave) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  return [...resto, ...otra.map((a) => ({ clave: a.clave, etiqueta: a.etiqueta || "Otra" }))];
}

/** El área que se preselecciona: la sección del menú donde está la persona, si el catálogo la tiene. */
export function areaDeLaRuta(pathname: string, areas: { clave: string }[]): string {
  const seccion = itemDeRuta(pathname)?.section;
  return seccion && areas.some((a) => a.clave === seccion) ? seccion : "";
}

export function megas(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace(".", ",")} MB`;
}

export function tamanoDeArchivo(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return megas(bytes);
}

/** Texto de la zona de adjuntos con los límites del catálogo. */
export function ayudaDeAdjuntos(limites: FeedbackLimites): string {
  const pdf = limites.mimetypes.includes("application/pdf");
  return `${pdf ? "Imágenes o PDF" : "Imágenes"}: hasta ${limites.max_adjuntos}, de ${megas(limites.max_bytes_por_archivo)} cada uno y ${megas(limites.max_bytes_total)} en total.`;
}

/**
 * Suma los archivos nuevos a los ya elegidos sin pasar los topes del catálogo (cantidad y total). Lo que no
 * cabe o ya estaba (mismo nombre, tamaño y fecha) se devuelve como aviso: así el envío no choca con un 413.
 */
export function sumarAdjuntos(
  actuales: File[],
  nuevos: File[],
  limites: FeedbackLimites,
): { archivos: File[]; avisos: string[] } {
  const archivos = [...actuales];
  const avisos: string[] = [];
  const igual = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  for (const archivo of nuevos) {
    const nombre = archivo.name || "archivo";
    if (archivos.some((a) => igual(a, archivo))) {
      avisos.push(`«${nombre}» ya está adjunto.`);
    } else if (archivos.length >= limites.max_adjuntos) {
      avisos.push(`Puedes adjuntar hasta ${limites.max_adjuntos} archivos.`);
    } else if (archivos.reduce((t, a) => t + a.size, 0) + archivo.size > limites.max_bytes_total) {
      avisos.push(`«${nombre}» no cabe: los adjuntos suman más de ${megas(limites.max_bytes_total)}.`);
    } else {
      archivos.push(archivo);
    }
  }
  return { archivos, avisos: [...new Set(avisos)] };
}

export type CamposDelReporte = { tipo: string; area: string; titulo: string; descripcion: string };
export type ErroresDelReporte = Partial<Record<keyof CamposDelReporte, string>>;

/** Las mismas reglas que el backend, para avisar antes de enviar. */
export function validarReporte(campos: CamposDelReporte): ErroresDelReporte {
  const errores: ErroresDelReporte = {};
  if (!campos.tipo) errores.tipo = "Elige si es un error, una mejora o una idea.";
  if (!campos.area) errores.area = "Elige en qué parte del panel pasa.";
  const titulo = campos.titulo.trim().length;
  if (titulo < TITULO_MIN) errores.titulo = `Escribe un título de al menos ${TITULO_MIN} caracteres.`;
  else if (titulo > TITULO_MAX) errores.titulo = `El título admite hasta ${TITULO_MAX} caracteres.`;
  const descripcion = campos.descripcion.trim().length;
  if (descripcion < DESCRIPCION_MIN) errores.descripcion = `Cuéntanos un poco más: al menos ${DESCRIPCION_MIN} caracteres.`;
  else if (descripcion > DESCRIPCION_MAX) errores.descripcion = `La descripción admite hasta ${DESCRIPCION_MAX} caracteres.`;
  return errores;
}

/** Campo del formulario al que apunta cada código de validación del backend. */
const CAMPO_DEL_CODIGO: Record<string, keyof CamposDelReporte> = {
  tipo_invalido: "tipo",
  area_invalida: "area",
  titulo_invalido: "titulo",
  descripcion_invalida: "descripcion",
};

export function campoDelError(code: string | undefined): keyof CamposDelReporte | null {
  return code ? (CAMPO_DEL_CODIGO[code] ?? null) : null;
}

function enMinutos(segundos: number): string {
  if (segundos < 90) return "en un minuto";
  const minutos = Math.ceil(segundos / 60);
  if (minutos < 90) return `en ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? "en una hora" : `en ${horas} horas`;
}

/**
 * Mensaje de un envío fallido (422, 413, 429, 503…): qué pasó y cómo seguir. Los códigos conocidos llevan
 * texto propio; si no, el mensaje de la API y, sin él, uno por estado.
 */
export function mensajeDeEnvio(
  status: number,
  cuerpo: { error?: string; code?: string } | null,
  reintentarEnSegundos: number | null = null,
): string {
  const espera = reintentarEnSegundos && reintentarEnSegundos > 0 ? ` Vuelve a intentarlo ${enMinutos(reintentarEnSegundos)}.` : "";
  switch (cuerpo?.code) {
    case "adjunto_invalido":
      return "Uno de los adjuntos no es una imagen o un PDF válido. Quítalo y vuelve a enviar.";
    case "adjunto_repetido":
      return "Adjuntaste el mismo archivo dos veces. Quita uno y vuelve a enviar.";
    case "demasiados_adjuntos":
      return "Son demasiados adjuntos. Quita alguno y vuelve a enviar.";
    case "adjunto_muy_grande":
      return "Uno de los adjuntos pesa demasiado. Quítalo o envía una captura más liviana.";
    case "adjuntos_muy_grandes":
      return "Los adjuntos pesan demasiado en total. Quita alguno y vuelve a enviar.";
    case "demasiados_reportes":
      return `Enviaste varios reportes seguidos.${espera || " Vuelve a intentarlo en un rato."}`;
    case "demasiados_reportes_del_negocio":
      return `Tu negocio ya envió muchos reportes hoy.${espera || " Vuelve a intentarlo mañana."}`;
    case "almacenamiento_no_disponible":
      return `No pudimos guardar los adjuntos y no se envió nada.${espera || " Vuelve a intentarlo en un momento."}`;
    case "idempotency_key_en_uso":
      return "Este formulario ya se usó desde otra cuenta. Ciérralo y ábrelo de nuevo.";
  }
  if (status === 413) return "Los adjuntos pesan demasiado. Quita alguno y vuelve a enviar.";
  if (status === 429) return `Enviaste varios reportes seguidos.${espera || " Vuelve a intentarlo en un rato."}`;
  if (cuerpo?.error) return cuerpo.error;
  if (status === 422) return "Revisa los datos del reporte y vuelve a enviar.";
  return "No pudimos enviar el reporte. Vuelve a intentarlo.";
}

/** `Retry-After` en segundos (solo la forma numérica, la que manda la API). */
export function segundosDeEspera(valor: string | null): number | null {
  if (!valor || !/^\d+$/.test(valor.trim())) return null;
  return Number(valor.trim());
}

/** «Ya lo habían reportado»: la etiqueta «Duplicado» sin enlace (el cliente nunca sabe a qué reporte apunta). */
export function esDuplicado(reporte: Pick<FeedbackReporteResumen, "estado" | "motivo_codigo">): boolean {
  return reporte.estado === "rechazado" && reporte.motivo_codigo === "duplicado";
}

/** «+5.000 créditos» si se aprobó; si no, una raya. */
export function creditosDelReporte(reporte: Pick<FeedbackReporteResumen, "estado" | "creditos_otorgados">): string {
  return reporte.estado === "aprobado" && reporte.creditos_otorgados ? `+${formatNumber(reporte.creditos_otorgados)} créditos` : "—";
}

/** Query del listado: solo las claves y valores que la API conoce. */
export function queryDeReportes(params: { alcance?: string | null; estado?: string | null; cursor?: string | null }): string {
  const qs = new URLSearchParams();
  if (params.alcance === "negocio") qs.set("alcance", "negocio");
  if (params.estado && Object.hasOwn(ESTADOS_DE_REPORTE, params.estado)) qs.set("estado", params.estado);
  if (params.cursor && params.cursor.length <= 200) qs.set("cursor", params.cursor);
  const texto = qs.toString();
  return texto ? `?${texto}` : "";
}
