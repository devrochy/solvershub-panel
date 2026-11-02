import { puedeEditarDatosCliente } from "@/lib/datos-cliente";
import type { OpcionConfig } from "@/lib/api/types";

/**
 * Secciones de Configuración, agrupadas por tarea (no por formulario): el dueño busca «cuándo
 * atiendo», no «Identidad». Este módulo es la única fuente del menú, de los alias de la URL y de
 * qué grupos del catálogo (SPEC-37) pinta cada sección de la antigua pantalla de Identidad.
 */

export type SeccionId =
  | "identidad"
  | "horario"
  | "datos-cliente"
  | "voz"
  | "calidad"
  | "memoria"
  | "chat-web"
  | "multimedia"
  | "whatsapp-web"
  | "cerebro"
  | "herramientas"
  | "agentspec"
  | "accesibilidad";

export type GrupoMenuId = "negocio" | "respuesta" | "canales" | "avanzado";

export type GrupoCatalogo = OpcionConfig["grupo"];

export interface Seccion {
  id: SeccionId;
  grupo: GrupoMenuId;
  titulo: string;
  /** Una línea que explica para qué sirve; se muestra bajo el título de la sección. */
  descripcion: string;
  /** Si la edita el formulario de identidad: qué grupos del catálogo pinta. */
  gruposIdentidad?: GrupoCatalogo[];
}

export const GRUPOS_MENU: { id: GrupoMenuId; titulo: string; nota?: string }[] = [
  { id: "negocio", titulo: "Mi negocio" },
  { id: "respuesta", titulo: "Cómo responde" },
  { id: "canales", titulo: "Canales y medios" },
  {
    id: "avanzado",
    titulo: "Avanzado",
    nota: "Normalmente no necesitas tocar esto: los valores por defecto funcionan para la mayoría de los negocios.",
  },
];

export const SECCIONES: Seccion[] = [
  {
    id: "identidad",
    grupo: "negocio",
    titulo: "Identidad",
    descripcion: "Cómo se presenta el asistente y dónde está tu negocio.",
    gruposIdentidad: ["identidad"],
  },
  {
    id: "horario",
    grupo: "negocio",
    titulo: "Horario y escalamiento",
    descripcion: "Cuándo atiende el asistente y cuándo pasa la conversación a una persona.",
    gruposIdentidad: ["horario", "escalamiento"],
  },
  {
    id: "datos-cliente",
    grupo: "negocio",
    titulo: "Datos del cliente",
    descripcion: "Qué datos pide el asistente, cómo avisas su uso y cómo se da de baja un cliente.",
  },
  {
    id: "voz",
    grupo: "respuesta",
    titulo: "Voz y estilo",
    descripcion: "La personalidad del asistente y el ritmo con que envía sus respuestas.",
    gruposIdentidad: ["voz", "respuesta"],
  },
  {
    id: "calidad",
    grupo: "respuesta",
    titulo: "Calidad de respuestas",
    descripcion: "Cuándo el asistente piensa más y qué validaciones aplica antes de responder.",
    gruposIdentidad: ["calidad"],
  },
  {
    id: "memoria",
    grupo: "respuesta",
    titulo: "Memoria",
    descripcion: "Cuánto de la conversación recuerda y cuánto conocimiento busca para responder.",
  },
  {
    id: "chat-web",
    grupo: "canales",
    titulo: "Chat web",
    descripcion: "El chat que puedes incrustar en tu sitio para que tus visitantes hablen con el asistente.",
  },
  {
    id: "multimedia",
    grupo: "canales",
    titulo: "Multimedia",
    descripcion: "Si el asistente entiende notas de voz e imágenes que manda el cliente.",
  },
  {
    id: "whatsapp-web",
    grupo: "canales",
    titulo: "WhatsApp Web (equipo SolversHub)",
    descripcion: "Política anti-baneo del canal no oficial de este negocio. El dueño del negocio no la ve.",
  },
  {
    id: "cerebro",
    grupo: "avanzado",
    titulo: "Cerebro y modelos",
    descripcion: "Qué modelos de IA usa el asistente y sus límites por turno.",
  },
  {
    id: "herramientas",
    grupo: "avanzado",
    titulo: "Herramientas del agente",
    descripcion: "Qué acciones puede ejecutar el asistente, con qué límite y si pide confirmación.",
  },
  {
    id: "agentspec",
    grupo: "avanzado",
    titulo: "AgentSpec y proveedor",
    descripcion: "Versiones del agente, editor crudo del AgentSpec, proveedor de IA y reglas personalizadas.",
  },
  {
    id: "accesibilidad",
    grupo: "avanzado",
    titulo: "Accesibilidad",
    descripcion: "Preferencias solo para ti, en este navegador.",
  },
];

/** Secciones que comparten el formulario (y el único PUT) de identidad. */
export const SECCIONES_DE_IDENTIDAD: SeccionId[] = SECCIONES.filter((s) => s.gruposIdentidad).map((s) => s.id);

export const SECCION_INICIAL: SeccionId = "identidad";

/**
 * Alias de `?tab=`: los ids de la antigua pantalla (`identity`, `skills`…) y los del panel clásico
 * (`identidad`, `habilidades`…). Los siguen usando enlaces de otras pantallas, el recorrido guiado y la
 * ayuda de sección, así que se mantienen aunque el parámetro nuevo sea `?seccion=`.
 */
export const ALIAS_TABS: Record<string, SeccionId> = {
  identity: "identidad",
  identidad: "identidad",
  brain: "cerebro",
  cerebro: "cerebro",
  memory: "memoria",
  memoria: "memoria",
  skills: "herramientas",
  habilidades: "herramientas",
  advanced: "agentspec",
  avanzado: "agentspec",
  "web-chat": "chat-web",
  "chat-web": "chat-web",
  media: "multimedia",
  multimedia: "multimedia",
  a11y: "accesibilidad",
  accesibilidad: "accesibilidad",
  "datos-cliente": "datos-cliente",
  "datos-del-cliente": "datos-cliente",
  waweb: "whatsapp-web",
  "whatsapp-web": "whatsapp-web",
};

const IDS = new Set<string>(SECCIONES.map((s) => s.id));

/** `?seccion=` gana a `?tab=`; ambos aceptan alias. Un valor desconocido cae en la sección inicial. */
export function resolverSeccion(
  pedido: { seccion?: string | null; tab?: string | null } | string | null | undefined,
  disponibles?: ReadonlySet<SeccionId>,
): SeccionId {
  const crudos = typeof pedido === "string" ? [pedido] : [pedido?.seccion, pedido?.tab];
  for (const crudo of crudos) {
    if (!crudo) continue;
    const id = IDS.has(crudo) ? (crudo as SeccionId) : ALIAS_TABS[crudo];
    if (id && (!disponibles || disponibles.has(id))) return id;
  }
  return SECCION_INICIAL;
}

/** Secciones que se muestran: WhatsApp Web solo existe para el master (el catálogo no la trae al resto). */
export function seccionesVisibles({ waweb }: { waweb: boolean }): Seccion[] {
  return SECCIONES.filter((s) => s.id !== "whatsapp-web" || waweb);
}

export function seccionPorId(id: SeccionId): Seccion {
  return SECCIONES.find((s) => s.id === id) ?? SECCIONES[0];
}

/**
 * Query string con la sección elegida: conserva los demás parámetros y retira `tab`, que ya no
 * manda (si quedara, un enlace copiado con ambos sería ambiguo).
 */
export function consultaConSeccion(consulta: string, id: SeccionId): string {
  const parametros = new URLSearchParams(consulta);
  parametros.delete("tab");
  parametros.set("seccion", id);
  return `?${parametros.toString()}`;
}

/**
 * Secciones de identidad donde hay campos con error. Las secciones de identidad guardan juntas
 * (un solo PUT), así que un error puede estar en una sección que la persona no está viendo.
 */
export function seccionesConErrores(
  claves: string[],
  grupoDe: (clave: string) => GrupoCatalogo | undefined,
): SeccionId[] {
  const encontradas = new Set<SeccionId>();
  for (const clave of claves) {
    const grupo = grupoDe(clave);
    const seccion = SECCIONES.find((s) => grupo && s.gruposIdentidad?.includes(grupo));
    if (seccion) encontradas.add(seccion.id);
  }
  return SECCIONES.filter((s) => encontradas.has(s.id)).map((s) => s.id);
}

/** Quien puede cambiar la configuración: master o permiso `settings` en escritura. */
export function puedeEditarConfiguracion(
  me: Parameters<typeof puedeEditarDatosCliente>[0],
): boolean {
  return puedeEditarDatosCliente(me);
}

/** Comparación profunda e independiente del orden de las claves, para saber si un formulario cambió. */
export function igualProfundo(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => igualProfundo(x, b[i]));
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  return (
    ka.length === kb.length &&
    ka.every((k) => k in (b as object) && igualProfundo((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}
