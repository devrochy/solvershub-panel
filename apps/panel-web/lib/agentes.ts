/**
 * Mi agente y su data (HU-AOS-47): lógica pura de la sección Agentes. Pestañas, filtros
 * (conexión y período) y textos legibles de lo que devuelve `/admin/agents/*`.
 */

export const PESTANAS = [
  { id: "conversaciones", label: "Conversaciones" },
  { id: "tareas", label: "Tareas" },
  { id: "registros", label: "Clientes y registros" },
  { id: "consumo", label: "Consumo y calidad" },
] as const;

export type Pestana = (typeof PESTANAS)[number]["id"];

export const PERIODOS = [
  { dias: 7, label: "Últimos 7 días" },
  { dias: 30, label: "Últimos 30 días" },
  { dias: 90, label: "Últimos 90 días" },
] as const;

export const DIAS_POR_DEFECTO = 30;

const REF_VALIDO = /^(general|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** El `ref` de la ruta: id del agente o `general`. Cualquier otra cosa es null (404). */
export function refValido(ref: string | undefined): string | null {
  const limpio = (ref ?? "").trim();
  return REF_VALIDO.test(limpio) ? limpio.toLowerCase() : null;
}

export function pestanaValida(valor: string | undefined): Pestana {
  return PESTANAS.find((p) => p.id === valor)?.id ?? "conversaciones";
}

export function diasValidos(valor: string | undefined): number {
  const n = Number(valor);
  return PERIODOS.some((p) => p.dias === n) ? n : DIAS_POR_DEFECTO;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FiltrosDeAgente = { dias: number; conexion: string | null; pagina: number; estado: "open" | "closed" | null };

export function filtrosDe(sp: Record<string, string | undefined>): FiltrosDeAgente {
  const pagina = Number(sp.page);
  return {
    dias: diasValidos(sp.dias),
    conexion: sp.conexion && UUID.test(sp.conexion) ? sp.conexion : null,
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
    estado: sp.estado === "open" || sp.estado === "closed" ? sp.estado : null,
  };
}

/** Query de la API para la pestaña: período (`desde`), conexión, página y estado de tareas. */
export function queryDeApi(f: FiltrosDeAgente, ahora: Date = new Date(), conPagina = true): string {
  const qs = new URLSearchParams();
  qs.set("desde", new Date(ahora.getTime() - f.dias * 86_400_000).toISOString());
  if (f.conexion) qs.set("connection_id", f.conexion);
  if (conPagina) qs.set("page", String(f.pagina));
  if (f.estado) qs.set("state", f.estado);
  return qs.toString();
}

/** Enlace de la vista con los filtros vigentes y lo que cambie (`null` quita el parámetro). */
export function hrefDeAgente(
  ref: string,
  actual: { tab: Pestana } & FiltrosDeAgente,
  cambios: Partial<{ tab: Pestana; dias: number; conexion: string | null; page: number; estado: string | null }> = {},
): string {
  const qs = new URLSearchParams();
  const tab = cambios.tab ?? actual.tab;
  if (tab !== "conversaciones") qs.set("tab", tab);
  const dias = cambios.dias ?? actual.dias;
  if (dias !== DIAS_POR_DEFECTO) qs.set("dias", String(dias));
  const conexion = "conexion" in cambios ? cambios.conexion : actual.conexion;
  if (conexion) qs.set("conexion", conexion);
  const estado = "estado" in cambios ? cambios.estado : actual.estado;
  if (estado && tab === "tareas") qs.set("estado", estado);
  const page = cambios.page ?? (cambios.tab || cambios.dias || "conexion" in cambios || "estado" in cambios ? 1 : actual.pagina);
  if (page > 1) qs.set("page", String(page));
  return `/agentes/${ref}${qs.size ? `?${qs.toString()}` : ""}`;
}

const TAREA: Record<string, string> = {
  active: "En curso",
  suspended: "En pausa",
  completed: "Completada",
  cancelled: "Cancelada",
  failed: "Falló",
  escalated: "Pasó a una persona",
};

export function estadoDeTarea(status: string): string {
  return TAREA[status] ?? "Otro estado";
}

const REGISTRO: Record<string, string> = {
  pedido: "Pedido",
  lead: "Lead",
  cita: "Cita",
  promesa: "Promesa de pago",
};

export function tipoDeRegistro(kind: string): string {
  return REGISTRO[kind] ?? kind.replaceAll("_", " ");
}

const TIPO_AGENTE: Record<string, string> = {
  specialist: "Especialista",
  backoffice: "Back-office",
  core: "Coordinador",
};

export function tipoDeAgente(kind: string): string {
  return TIPO_AGENTE[kind] ?? "Agente";
}

/** Procedimiento legible: `agendar_cita` → «Agendar cita». */
export function nombreDeProcedimiento(id: string): string {
  const texto = id.split(/[.:/]/).pop()?.replaceAll(/[_-]+/g, " ").trim() ?? id;
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : id;
}

/** pass^k en porcentaje con la tendencia frente a la medición anterior (más reciente primero). */
export function consistencia(mediciones: { pass_k: number; k: number }[]): {
  actual: number | null;
  k: number | null;
  delta: number | null;
} {
  const [ultima, previa] = mediciones;
  if (!ultima) return { actual: null, k: null, delta: null };
  const actual = Math.round(ultima.pass_k * 1000) / 10;
  const delta = previa ? Math.round((ultima.pass_k - previa.pass_k) * 1000) / 10 : null;
  return { actual, k: ultima.k, delta };
}
