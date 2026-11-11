/**
 * Mi agente y su data (HU-AOS-47): lógica pura de la sección Agentes. Pestañas, filtros
 * (conexión y período) y textos legibles de lo que devuelve `/admin/agents/*`.
 */

export const PESTANAS = [
  // AGT-04: lo que hizo (conversaciones, tareas, clientes y registros), lo que sabe (superpoderes y
  // documentos), dónde atiende y cuánto consume. «Probar» es un botón de la cabecera.
  { id: "actividad", label: "Actividad" },
  { id: "sabe", label: "Lo que sabe" },
  { id: "atiende", label: "Dónde atiende" },
  { id: "consumo", label: "Consumo" },
] as const;

export type Pestana = (typeof PESTANAS)[number]["id"];

/** Qué se ve dentro de Actividad. */
export const VISTAS_DE_ACTIVIDAD = [
  { id: "conversaciones", label: "Conversaciones" },
  { id: "tareas", label: "Tareas" },
  { id: "clientes", label: "Clientes" },
  { id: "registros", label: "Registros" },
] as const;

export type VistaDeActividad = (typeof VISTAS_DE_ACTIVIDAD)[number]["id"];

/** Pestañas sin período ni conexión. */
export const PESTANAS_SIN_FILTROS: ReadonlySet<Pestana> = new Set(["sabe", "atiende"]);

/**
 * Las ocho pestañas de antes siguen abriendo su lugar (Resumen enlaza `?tab=tareas` y `?tab=consumo`,
 * el editor `?tab=conocimiento`): `?tab=probar` abre la actividad con el chat de prueba abierto.
 */
const PESTANAS_DE_ANTES: Record<string, { tab: Pestana; ver?: VistaDeActividad; probar?: true }> = {
  conversaciones: { tab: "actividad", ver: "conversaciones" },
  tareas: { tab: "actividad", ver: "tareas" },
  registros: { tab: "actividad", ver: "registros" },
  conexiones: { tab: "atiende" },
  superpoderes: { tab: "sabe" },
  conocimiento: { tab: "sabe" },
  probar: { tab: "actividad", probar: true },
};

export type UbicacionEnLaFicha = { tab: Pestana; ver: VistaDeActividad; probar: boolean };

/** Pestaña y vista de la URL: las de ahora o las de antes; cualquier otra cosa, la actividad. */
export function ubicacionDe(sp: Record<string, string | undefined>): UbicacionEnLaFicha {
  const antes = sp.tab ? PESTANAS_DE_ANTES[sp.tab] : undefined;
  const tab = PESTANAS.find((p) => p.id === sp.tab)?.id ?? antes?.tab ?? "actividad";
  const ver = VISTAS_DE_ACTIVIDAD.find((v) => v.id === sp.ver)?.id ?? antes?.ver ?? "conversaciones";
  return { tab, ver, probar: Boolean(antes?.probar) || sp.probar === "1" };
}

export function pestanaValida(valor: string | undefined): Pestana {
  return ubicacionDe({ tab: valor }).tab;
}

export const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
] as const;

export const DIAS_POR_DEFECTO = 30;

const REF_VALIDO = /^(general|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** El `ref` de la ruta: id del agente o `general`. Cualquier otra cosa es null (404). */
export function refValido(ref: string | undefined): string | null {
  const limpio = (ref ?? "").trim();
  return REF_VALIDO.test(limpio) ? limpio.toLowerCase() : null;
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
  actual: { tab: Pestana; ver: VistaDeActividad } & FiltrosDeAgente,
  cambios: Partial<{ tab: Pestana; ver: VistaDeActividad; dias: number; conexion: string | null; page: number; estado: string | null }> = {},
): string {
  const qs = new URLSearchParams();
  const tab = cambios.tab ?? actual.tab;
  if (tab !== "actividad") qs.set("tab", tab);
  const ver = cambios.ver ?? actual.ver;
  if (tab === "actividad" && ver !== "conversaciones") qs.set("ver", ver);
  const dias = cambios.dias ?? actual.dias;
  if (dias !== DIAS_POR_DEFECTO) qs.set("dias", String(dias));
  const conexion = "conexion" in cambios ? cambios.conexion : actual.conexion;
  if (conexion) qs.set("conexion", conexion);
  const estado = "estado" in cambios ? cambios.estado : actual.estado;
  if (estado && tab === "actividad" && ver === "tareas") qs.set("estado", estado);
  const cambiaLaVista = cambios.tab || cambios.ver || cambios.dias || "conexion" in cambios || "estado" in cambios;
  const page = cambios.page ?? (cambiaLaVista ? 1 : actual.pagina);
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

/**
 * Qué hace el agente, en una frase (AGT-01): su propósito si lo tiene; el General y el Coordinador,
 * que crea el sistema, dicen que coordinan (el General es `specialist` en la API).
 */
export function papelDelAgente(agente: { key: string; kind: string }, proposito?: string | null): string {
  // Sin el punto final: la frase sigue con «· Atiende en…».
  const texto = proposito?.trim().replace(/\.+$/, "");
  if (texto) return texto;
  if (agente.key === "general") return "Coordina a los demás y responde lo que nadie más sabe";
  if (agente.kind === "core") return "Reparte cada conversación al agente que sabe";
  return tipoDeAgente(agente.kind);
}

/** Procedimiento legible: `agendar_cita` → «Agendar cita». */
export function nombreDeProcedimiento(id: string): string {
  const texto = id.split(/[.:/]/).pop()?.replaceAll(/[_-]+/g, " ").trim() ?? id;
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : id;
}

/** Palabras que los ids escriben sin tilde. */
const TILDES: Record<string, string> = {
  direccion: "dirección",
  informacion: "información",
  cotizacion: "cotización",
  confirmacion: "confirmación",
  verificacion: "verificación",
  devolucion: "devolución",
  ubicacion: "ubicación",
  envio: "envío",
  dia: "día",
  telefono: "teléfono",
  numero: "número",
  metodo: "método",
};

/** Etapa de una tarea en palabras (AGT-07): `confirmar_direccion` → «Confirmar dirección»; `fin`, «Terminó». */
export function nombreDeEtapa(stage: string | null | undefined): string {
  if (!stage) return "—";
  if (stage === "fin" || stage === "end") return "Terminó";
  const nombre = nombreDeProcedimiento(stage);
  return nombre.replaceAll(/[a-záéíóúñ]+/gi, (palabra) => {
    const con = TILDES[palabra.toLowerCase()];
    if (!con) return palabra;
    return palabra[0] === palabra[0].toUpperCase() ? con.charAt(0).toUpperCase() + con.slice(1) : con;
  });
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

/**
 * ¿Mostrar «Nuevo agente» y «Editar» (editor de HU-AOS-24)? Escriben en la sección `settings` y,
 * con el runtime legacy, solo el master (la API responde 403 `aos_runtime_legacy`).
 */
/** ¿La pestaña Conocimiento aplica? Solo a especialistas (el Coordinador no tiene documentos). */
export function tieneConocimiento(agente: { id?: string | null; kind: string }): boolean {
  return Boolean(agente.id) && agente.kind === "specialist";
}

/** ¿La pestaña Superpoderes aplica? Igual que el editor por pasos: especialistas con id. */
export function tieneSuperpoderes(agente: { id?: string | null; kind: string }): boolean {
  return Boolean(agente.id) && agente.kind === "specialist";
}

/** Conexiones y Probar: cualquier agente real (el General virtual no tiene id ni conexiones propias). */
export function tieneConexiones(agente: { id?: string | null }): boolean {
  return Boolean(agente.id);
}

/** Subir, borrar y reprocesar documentos: escritura en la sección `agents` (o master). */
export function puedeEscribirConocimiento(me: {
  role?: string | null;
  permissions?: Record<string, string | null | undefined> | null;
}): boolean {
  return me.role === "master" || me.permissions?.agents === "write";
}

export function puedeEditarAgentes(
  me: { role?: string | null; permissions?: Record<string, string | null | undefined> | null },
  runtime: string,
): boolean {
  if (me.role === "master") return true;
  return runtime === "v3" && me.permissions?.settings === "write";
}

/** Agentes que crea el sistema con el negocio: la API no deja archivarlos (409 `agent_reserved`). */
export const KEYS_RESERVADAS: ReadonlySet<string> = new Set(["general", "coordinador"]);

export function estaArchivado(agente: { status?: string | null }): boolean {
  return agente.status === "archived";
}

/** Archivar o reactivar: solo agentes reales (con id) que no sean el General ni el Coordinador. */
export function puedeArchivar(agente: { id?: string | null; key: string; virtual?: boolean }): boolean {
  return Boolean(agente.id) && !agente.virtual && !KEYS_RESERVADAS.has(agente.key);
}

/** Los archivados van al final de la lista, sin cambiar el orden del resto. */
export function archivadosAlFinal<T extends { status?: string | null }>(agentes: T[]): T[] {
  return [...agentes.filter((a) => !estaArchivado(a)), ...agentes.filter(estaArchivado)];
}

/** Dónde atiende, en palabras: «Atiende en Chat de la tienda», «Atiende en 3 conexiones». */
export function dondeAtiende(conexiones: { label: string }[]): string {
  if (conexiones.length === 0) return "Todavía no está en ninguna conexión";
  if (conexiones.length === 1) return `Atiende en ${conexiones[0].label}`;
  return `Atiende en ${conexiones.length} conexiones`;
}

/** Estado del agente en la lista y en la ficha. */
export function estadoDelAgente(agente: { virtual: boolean; published: boolean; status?: string | null }): {
  label: string;
  tono: "success" | "neutral" | "info";
} {
  if (agente.virtual) return { label: "Historial del asistente", tono: "info" };
  if (estaArchivado(agente)) return { label: "Archivado", tono: "neutral" };
  return agente.published ? { label: "Atendiendo", tono: "success" } : { label: "Sin conexión activa", tono: "neutral" };
}

const CONVERSACION: Record<string, { label: string; tono: "info" | "success" | "warning" }> = {
  open: { label: "Abierta", tono: "info" },
  active: { label: "Abierta", tono: "info" },
  resolved: { label: "Resuelta", tono: "success" },
  closed: { label: "Cerrada", tono: "success" },
  escalated: { label: "Pasó a una persona", tono: "warning" },
  handoff: { label: "Pasó a una persona", tono: "warning" },
};

/** Estado de una conversación del agente; uno que no conocemos no se muestra. */
export function estadoDeConversacion(status: string | null | undefined): { label: string; tono: "info" | "success" | "warning" } | null {
  return (status && CONVERSACION[status]) || null;
}

/** «1 respuesta», «14 respuestas»: lo que la API llama turnos. */
export function respuestas(n: number): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? "respuesta" : "respuestas"}`;
}
