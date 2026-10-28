/**
 * Colaboración entre agentes (HU-AOS-26): lógica pura de la vista de permisos y de «Probar una
 * frase». Los permisos son los enlaces del grafo A2A del negocio (ADR-0116, adenda HU-AOS-18):
 * quién puede pasar la conversación, encargar o consultar a quién.
 */
import type { Link, RoutePreview } from "@/lib/api/types";

export type Modo = "handoff" | "delegate" | "query";

/** En el orden en que se muestran. */
export const MODOS: { modo: Modo; etiqueta: string; ayuda: string }[] = [
  {
    modo: "handoff",
    etiqueta: "Pasar la conversación",
    ayuda: "Le entrega el cliente con todo lo que ya dio; desde el siguiente mensaje lo atiende el otro.",
  },
  {
    modo: "delegate",
    etiqueta: "Encargar",
    ayuda: "Le pide que haga un recorrido de su área con los datos del cliente, sin pasarle la conversación.",
  },
  {
    modo: "query",
    etiqueta: "Consultar",
    ayuda: "Le pregunta un dato de su área (por ejemplo, un estado) y sigue atendiendo.",
  },
];

/** Un permiso tal como se edita: el par y sus modos. El resto de campos del enlace se conserva. */
export interface Permiso {
  from_agent_id: string;
  to_agent_id: string;
  modes: Modo[];
  /** Los demás campos del enlace guardado (intenciones, límites…), intactos al guardar. */
  resto?: Omit<Link, "from_agent_id" | "to_agent_id" | "modes">;
}

export interface AgenteMin {
  id: string;
  name: string;
}

export function desdeEnlaces(links: Link[]): Permiso[] {
  return links.map(({ from_agent_id, to_agent_id, modes, ...resto }) => ({
    from_agent_id,
    to_agent_id,
    modes: modes.filter((m): m is Modo => m === "handoff" || m === "delegate" || m === "query"),
    resto,
  }));
}

export function tieneModo(permisos: Permiso[], desde: string, hacia: string, modo: Modo): boolean {
  return permisos.some((p) => p.from_agent_id === desde && p.to_agent_id === hacia && p.modes.includes(modo));
}

/** Activa o quita un modo de un par. Un par sin modos desaparece (el grafo no guarda vacíos). */
export function conModo(permisos: Permiso[], desde: string, hacia: string, modo: Modo, activo: boolean): Permiso[] {
  const actual = permisos.find((p) => p.from_agent_id === desde && p.to_agent_id === hacia);
  const otros = permisos.filter((p) => p !== actual);
  const modos = new Set<Modo>(actual?.modes ?? []);
  if (activo) modos.add(modo);
  else modos.delete(modo);
  if (modos.size === 0) return otros;
  const ordenados = MODOS.map((m) => m.modo).filter((m) => modos.has(m));
  return [...otros, { from_agent_id: desde, to_agent_id: hacia, modes: ordenados, resto: actual?.resto }];
}

/** Lo que se manda a `PUT /admin/a2a/graph`: cada par con sus modos y los campos que ya tenía. */
export function paraGuardar(permisos: Permiso[]): Record<string, unknown>[] {
  return permisos
    .filter((p) => p.modes.length > 0 && p.from_agent_id !== p.to_agent_id)
    .map((p) => ({ ...(p.resto ?? {}), from_agent_id: p.from_agent_id, to_agent_id: p.to_agent_id, modes: p.modes }));
}

/** ¿Cambió algo frente a lo guardado? (sin importar el orden). */
export function hayCambios(guardados: Permiso[], actuales: Permiso[]): boolean {
  const clave = (ps: Permiso[]) =>
    ps
      .filter((p) => p.modes.length > 0)
      .map((p) => `${p.from_agent_id}>${p.to_agent_id}:${[...p.modes].sort().join(",")}`)
      .sort()
      .join("|");
  return clave(guardados) !== clave(actuales);
}

/**
 * Ciclos de «pasar la conversación» (A → B → … → A), con los nombres de los agentes. No bloquean
 * (devolver el control es legítimo), pero se avisan antes de guardar. Misma regla que
 * `advertencias()` del backend: caminos de hasta 6 agentes, cada ciclo una sola vez.
 */
export function ciclosDeHandoff(permisos: Permiso[], nombres: Record<string, string>): string[] {
  const aristas = new Map<string, Set<string>>();
  for (const p of permisos) {
    if (!p.modes.includes("handoff")) continue;
    if (!aristas.has(p.from_agent_id)) aristas.set(p.from_agent_id, new Set());
    aristas.get(p.from_agent_id)!.add(p.to_agent_id);
  }
  const ciclos = new Set<string>();
  const visitar = (nodo: string, camino: string[]) => {
    for (const siguiente of [...(aristas.get(nodo) ?? [])].sort()) {
      const i = camino.indexOf(siguiente);
      if (i >= 0) {
        const ciclo = camino.slice(i);
        const menor = ciclo.indexOf([...ciclo].sort()[0]);
        ciclos.add([...ciclo.slice(menor), ...ciclo.slice(0, menor)].join(">"));
      } else if (camino.length < 6) {
        visitar(siguiente, [...camino, siguiente]);
      }
    }
  };
  for (const inicio of [...aristas.keys()].sort()) visitar(inicio, [inicio]);
  return [...ciclos].sort().map((c) => {
    const ids = c.split(">");
    return [...ids, ids[0]].map((id) => nombres[id] ?? "un agente").join(" → ");
  });
}

/** Las advertencias del servidor (`ciclo_handoff:<id>><id>`) con nombres. */
export function advertenciasLegibles(warnings: string[], nombres: Record<string, string>): string[] {
  return warnings.map((w) => {
    if (!w.startsWith("ciclo_handoff:")) return w;
    const ids = w.slice("ciclo_handoff:".length).split(">");
    return [...ids, ids[0]].map((id) => nombres[id] ?? "un agente").join(" → ");
  });
}

/** Mensaje claro para un código de error de la API del grafo. */
export function mensajeDeError(code: string | undefined, porDefecto?: string): string {
  switch (code) {
    case "modo_no_permitido":
      return "Ese tipo de permiso no existe. Usa pasar la conversación, encargar o consultar.";
    case "autollamada":
      return "Un agente no puede darse permiso a sí mismo.";
    case "enlace_repetido":
      return "Hay dos permisos para el mismo par de agentes. Recarga la página e inténtalo de nuevo.";
    case "agente_desconocido":
      return "Uno de los agentes ya no existe en tu negocio. Recarga la página.";
    case "demasiados_enlaces":
      return "Son demasiados permisos (máximo 200).";
    case "aos_runtime_legacy":
      return "Los permisos entre agentes se activan con el Agent OS de tu negocio.";
    case "sin_release_activa":
      return "Esta conexión todavía no tiene una versión activa: publica una para probar.";
    default:
      return porDefecto ?? "No se pudo completar. Inténtalo de nuevo.";
  }
}

/** ¿Puede editar los permisos? Igual que el editor de agentes: master, o v3 con `settings` en escritura. */
export function puedeEditarPermisos(
  me: { role?: string | null; permissions?: Record<string, string | null | undefined> | null },
  runtime: string,
): boolean {
  if (me.role === "master") return true;
  return runtime === "v3" && me.permissions?.settings === "write";
}

// ---------------------------------------------------------------- probar una frase

export interface Explicacion {
  agente: string;
  porque: string;
  avisos: string[];
}

function porcentaje(valor: number | null | undefined): string {
  return valor == null ? "" : `${Math.round(valor * 100)} %`;
}

/** El resultado de «Probar una frase» en lenguaje claro. */
export function explicarPrueba(p: RoutePreview, nombresPorKey: Record<string, string>): Explicacion {
  const agente = nombresPorKey[p.agent_key] ?? p.agent_key;
  let porque: string;
  if (p.source === "rule") {
    porque = `Lo decide la regla «${p.rule_id ?? "sin nombre"}» del Coordinador.`;
  } else if (p.source === "trigger") {
    porque = `La frase se parece a los ejemplos de «${p.procedure_title ?? p.procedure_id ?? "un recorrido"}» (${porcentaje(p.confidence)} de coincidencia).`;
  } else {
    porque = p.candidates.length
      ? "Ningún recorrido coincide con suficiente claridad: atiende el agente por defecto."
      : "La frase no se parece a ningún recorrido: atiende el agente por defecto.";
  }
  const avisos: string[] = [];
  if (p.mode === "off") {
    avisos.push("Hoy el enrutamiento está apagado en tu negocio: todas las conversaciones las atiende el agente por defecto.");
  } else if (p.mode === "shadow") {
    avisos.push("El enrutamiento está en modo de observación: decide y lo registra, pero todavía atiende el agente por defecto.");
  }
  if (p.not_evaluated_rules.length) {
    avisos.push(
      `Sin una conversación real no se evalúan las reglas por datos del cliente, etapa u horario: ${p.not_evaluated_rules.join(", ")}.`,
    );
  }
  return { agente, porque, avisos };
}
