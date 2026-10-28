/**
 * Versiones de una conexión (HU-AOS-27): lógica pura de la vista. Qué es cada versión (activa,
 * candidata, detenida…), si se puede publicar según el gate de pass^k y cómo se explica cada
 * cambio del diff en lenguaje claro.
 */
import type { Evaluation, ReleaseDiff, ReleaseSummary } from "@/lib/api/types";

export type Estado = "activa" | "candidata" | "detenida" | "anterior" | "retirada";

/**
 * El papel de una versión en la conexión. Las más nuevas que la activa son candidatas.
 * - `detenida`: la detuvo el dueño (`invalid`); no se puede activar.
 * - `retirada`: el sistema la sacó de una prueba por ir peor (`canary_stopped` bloqueante,
 *   HU-AOS-32); tampoco se puede activar.
 * Una prueba que detuvo el dueño no bloquea: la versión vuelve a ser candidata (o anterior).
 */
export function estadoDe(r: ReleaseSummary, numeroActiva: number | null): Estado {
  if (r.active) return "activa";
  if (r.detenida) return r.lifecycle === "canary_stopped" ? "retirada" : "detenida";
  if (r.lifecycle === "invalid") return "detenida";
  if (numeroActiva === null || r.number > numeroActiva) return "candidata";
  return "anterior";
}

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  activa: "Activa",
  candidata: "Candidata",
  detenida: "Detenida",
  anterior: "Anterior",
  retirada: "Retirada de la prueba",
};

export interface Publicacion {
  /** ¿Se muestra «Publicar a todos» habilitado? */
  puede: boolean;
  /** Por qué no (o un aviso cuando sí se puede sin pruebas). */
  motivo: string | null;
  /** ¿Ofrecer «Medir ahora»? */
  medir: boolean;
}

const MOTIVO_MEDICION: Record<string, string> = {
  en_curso: "Las pruebas automáticas de esta versión están corriendo.",
  vencida: "La última medición no terminó a tiempo. Vuelve a medirla.",
  fallida: "La última medición falló por un problema técnico (no es un rechazo). Vuelve a medirla.",
  tope_alcanzado: "Se alcanzó el tope mensual de pruebas automáticas de tu negocio.",
  demasiados_intentos: "La medición falló varias veces hoy. Pide ayuda al equipo de SolversHub.",
  sin_escenarios: "",
};

/**
 * ¿Se puede publicar la candidata? (decisión del dueño, 2026-10-25)
 * - Gate apagado: sí, con el aviso de probarla en el chat de prueba.
 * - Gate cerrado: solo con un veredicto aprobado (o si la medición no encontró escenarios, que pasa
 *   anotada). Si no, el botón no está disponible y se explica por qué; «Medir ahora» cuando aplica.
 */
export function publicacion(ev: Evaluation | null): Publicacion {
  if (!ev || !ev.gate_cerrado) {
    return {
      puede: true,
      motivo: "Esta versión no tiene pruebas automáticas: pruébala en «Probar asistente» antes de publicarla.",
      medir: false,
    };
  }
  if (ev.veredicto) {
    if (ev.veredicto.aprobado) return { puede: true, motivo: null, medir: false };
    return {
      puede: false,
      motivo: "No pasó las pruebas automáticas: algún recorrido quedó por debajo del mínimo o peor que la versión activa.",
      medir: false,
    };
  }
  const estado = ev.medicion?.estado ?? null;
  if (estado === "sin_escenarios") {
    return { puede: true, motivo: "Los recorridos que cambian no tienen pruebas automáticas todavía: se publica sin medir.", medir: false };
  }
  if (estado === "en_curso") return { puede: false, motivo: MOTIVO_MEDICION.en_curso, medir: false };
  if (estado === "demasiados_intentos" || estado === "tope_alcanzado") {
    return { puede: false, motivo: MOTIVO_MEDICION[estado], medir: false };
  }
  return {
    puede: false,
    motivo: (estado && MOTIVO_MEDICION[estado]) || "Antes de publicarla hay que medirla con las pruebas automáticas.",
    medir: true,
  };
}

/** El aviso de volver a la versión anterior: qué pasa con las conversaciones abiertas. */
export function textoVolverAtras(numero: number): string {
  return (
    `Desde el próximo mensaje de cada cliente se usa la versión ${numero} (en segundos). ` +
    "Las conversaciones en curso cambian ya, sin esperar a que terminen. Las tareas a medio hacer se " +
    "conservan si esa versión las tiene; si no, se cancelan, o pasan a una persona cuando ya hubo un pago " +
    "u otra acción que no se puede deshacer."
  );
}

/** Al publicar una candidata, las conversaciones en curso terminan con la versión que tenían. */
export function textoPublicar(numero: number): string {
  return (
    `Las conversaciones nuevas usarán la versión ${numero}. Las que están en curso siguen con la ` +
    "versión anterior hasta que terminen. Si algo sale mal, puedes volver a la anterior con un clic."
  );
}

// ---------------------------------------------------------------- diferencias en lenguaje claro

const SECCION: Record<string, string> = {
  persona: "personalidad y estilo",
  model: "modelo de lenguaje",
  tools: "superpoderes del agente",
  declarativeTools: "herramientas propias",
  procedures: "recorridos",
  playbooks: "guías",
  memory: "memoria",
  knowledge: "conocimiento",
  guardrails: "límites de lo que dice",
  exposes: "lo que ofrece a otros agentes",
  policies: "políticas",
  description: "descripción",
  extensions: "ajustes avanzados",
  voice: "voz del asistente",
  episode: "duración de las conversaciones",
  routing: "reparto entre agentes",
  modelPolicy: "modelo para pasos delicados",
  a2a: "límites de colaboración",
  composition: "forma de las respuestas",
  responses: "textos del Coordinador",
};

const AJUSTE: Record<string, string> = {
  assistant_name: "nombre del asistente",
  business_description: "descripción del negocio",
  language: "idioma",
  brand_voice: "voz de marca",
};

const MODO: Record<string, string> = { handoff: "pasar la conversación", delegate: "encargar", query: "consultar" };

export function seccionLegible(clave: string): string {
  return SECCION[clave] ?? "otros ajustes";
}

export interface Grupo {
  titulo: string;
  lineas: string[];
}

function lista(cosas: string[]): string {
  return cosas.join(", ");
}

/** El diff agrupado como lo lee el dueño. Vacío = la versión no cambia nada visible. */
export function gruposDelDiff(d: ReleaseDiff): Grupo[] {
  const grupos: Grupo[] = [];
  const agentes: string[] = [];
  for (const a of d.agentes) {
    const nombre = a.rol === "core" ? "Coordinador" : a.nombre;
    if (a.cambio === "nuevo") agentes.push(`${nombre}: agente nuevo.`);
    else if (a.cambio === "retirado") agentes.push(`${nombre}: sale de la conexión.`);
    else {
      const partes: string[] = [];
      const secciones = [...new Set((a.secciones ?? []).map(seccionLegible))];
      if (secciones.length) partes.push(`cambia ${lista(secciones)}`);
      if (a.herramientas_agregadas?.length) partes.push(`suma ${lista(a.herramientas_agregadas)}`);
      if (a.herramientas_quitadas?.length) partes.push(`quita ${lista(a.herramientas_quitadas)}`);
      if (a.procedimientos_agregados?.length) partes.push(`nuevos recorridos: ${lista(a.procedimientos_agregados)}`);
      if (a.procedimientos_quitados?.length) partes.push(`deja ${lista(a.procedimientos_quitados)}`);
      if (a.por_defecto != null) partes.push(a.por_defecto ? "pasa a ser el agente por defecto" : "deja de ser el agente por defecto");
      agentes.push(`${nombre}: ${partes.length ? partes.join("; ") : "otra versión"}.`);
    }
  }
  if (agentes.length) grupos.push({ titulo: "Agentes", lineas: agentes });

  const sp = d.superpoderes;
  const superpoderes = sp.habilidades.map((h) =>
    h.cambio === "agregada"
      ? `Se activa ${h.nombre}.`
      : h.cambio === "quitada"
        ? `Se desactiva ${h.nombre}.`
        : `${h.nombre} pasa de la versión ${h.antes} a la ${h.ahora}.`,
  );
  if (sp.plugins_agregados.length) superpoderes.push(`Plugins nuevos: ${lista(sp.plugins_agregados)}.`);
  if (sp.plugins_quitados.length) superpoderes.push(`Plugins que salen: ${lista(sp.plugins_quitados)}.`);
  if (superpoderes.length) grupos.push({ titulo: "Superpoderes", lineas: superpoderes });

  const permisos = d.permisos.map((p) => {
    const modos = (ms: string[]) => lista(ms.map((m) => MODO[m] ?? m));
    if (p.cambio === "agregado") return `${p.desde} podrá ${modos(p.modos_ahora)} a ${p.hacia}.`;
    if (p.cambio === "quitado") return `${p.desde} ya no podrá ${modos(p.modos_antes)} a ${p.hacia}.`;
    return `${p.desde} con ${p.hacia}: de ${modos(p.modos_antes)} a ${modos(p.modos_ahora)}.`;
  });
  if (permisos.length) grupos.push({ titulo: "Permisos entre agentes", lineas: permisos });

  const otros: string[] = [];
  if (d.otros.ajustes.length) otros.push(`Ajustes del asistente: ${lista(d.otros.ajustes.map((a) => AJUSTE[a] ?? a))}.`);
  if (d.otros.playbooks.length) otros.push(`Guías del negocio: ${lista(d.otros.playbooks)}.`);
  if (d.otros.flujo) otros.push("Cambia el flujo de la conversación.");
  if (otros.length) grupos.push({ titulo: "Otros", lineas: otros });
  return grupos;
}

/** Los recorridos que medirá el gate, por su título. */
export function recorridosAMedir(d: ReleaseDiff): string[] {
  return d.medira.map((m) => m.titulo ?? m.procedure_id);
}

/** Mensaje claro para un código de error de la API de versiones. */
export function mensajeDeError(code: string | undefined, porDefecto?: string): string {
  switch (code) {
    case "gate_pendiente":
      return "Antes de publicarla hay que medirla con las pruebas automáticas. La medición quedó en camino.";
    case "gate_rechazado":
      return "No pasó las pruebas automáticas.";
    case "release_retirada":
      return "Esa versión fue retirada y no se puede publicar.";
    case "habilidad_retirada":
      return "Esa versión usa una habilidad retirada por seguridad: no se puede publicar.";
    case "ya_activa":
      return "Esa versión ya es la activa.";
    case "ya_detenida":
      return "Esa versión ya estaba detenida.";
    case "es_canary":
      return "Esa versión está en prueba con una parte de los clientes: detén la prueba o publícala desde su bloque.";
    case "canary_en_curso":
      return "Hay una versión en prueba en esta conexión: publícala o detén la prueba primero.";
    case "canary_peor":
      return "Atiende peor que la versión actual: no se puede publicar.";
    case "canary_sin_muestra":
      return "Todavía no hay suficientes conversaciones para compararla con la versión actual.";
    case "canary_senal_dura":
      return "Varias respuestas de la versión en prueba llegaron mal al cliente: no se puede publicar.";
    case "canary_cambiado":
      return "La prueba cambió mientras se publicaba. Revisa su estado y vuelve a intentarlo.";
    case "canary_no_disponible":
      return "La prueba con una parte de los clientes todavía no está disponible.";
    case "sin_canary":
      return "No hay ninguna versión en prueba en esta conexión.";
    case "porcentaje_invalido":
      return "El porcentaje debe estar entre 1 y 50.";
    case "requiere_v3":
      return "La prueba con una parte de los clientes se activa con el Agent OS de tu negocio.";
    case "sin_release_activa":
      return "La conexión no tiene una versión activa con la cual comparar.";
    case "sin_version_anterior":
      return "No hay una versión anterior a la cual volver.";
    case "gate_abierto":
      return "Las pruebas automáticas no están activas en tu negocio.";
    case "aos_runtime_legacy":
      return "Las versiones se activan con el Agent OS de tu negocio.";
    default:
      return porDefecto ?? "No se pudo completar. Inténtalo de nuevo.";
  }
}

/** ¿Puede publicar, volver atrás o detener? Igual que la API: propietario o master, y con el
 * runtime legacy solo el master. */
export function puedeOperarVersiones(
  me: { role?: string | null; tenant?: { role?: string | null } | null; permissions?: Record<string, string | null | undefined> | null },
  runtime: string,
): boolean {
  if (me.role === "master") return true;
  return runtime === "v3" && me.tenant?.role === "owner" && me.permissions?.connections === "write";
}
