/**
 * Editor de agentes desde plantillas (HU-AOS-24): lógica pura del formulario por pasos.
 *
 * El borrador es un AgentSpec v3 (`agentspec/3`). El editor solo toca lo que el dueño ve
 * (persona, superpoderes y sus frases, memoria) y conserva intacto el resto del
 * contenido (guardrails, declarativas, tools y playbooks ajenos...). Las reglas que se repiten aquí
 * las vuelve a exigir la API al publicar (`POST /admin/agents/{id}/publish`); este módulo solo
 * adelanta los mismos errores junto a cada campo.
 */
import { accionesDesdeContenido, aplicarAcciones, type AccionEnEditor } from "@/lib/acciones-del-agente";
import type { AgentAction, Superpower } from "@/lib/api/types";
import { aplicarConocimiento, conocimientoDesdeContenido, type ConocimientoEnEditor } from "@/lib/conocimiento";
import type { IdentitySettings } from "@/lib/api/types";
import { EMOJIS, LARGOS, MOTIVOS_DE_ESCALAR, TONOS, estadoDesdeIdentidad, resumenDeHorario } from "@/lib/onboarding";
import type { VozDeVistaPrevia } from "@/lib/vista-previa";

/**
 * Los ocho pasos del recorrido común del agente (SPEC-47, D-75): los mismos de Nuevo agente y de la
 * bienvenida. «Proveedor y modelo» ya no es un paso: el agente usa el modelo del negocio (HU-AOS-79).
 */
export type PasoId = "identidad" | "voz" | "reglas" | "habilidades" | "flujo" | "conocimiento" | "probar" | "publicar";

export const PASOS: { id: PasoId; titulo: string; corto?: string; descripcion: string; pregunta: string }[] = [
  { id: "identidad", titulo: "Identidad", descripcion: "Nombre y para qué sirve.", pregunta: "¿Cómo se llama tu agente y para qué sirve?" },
  { id: "voz", titulo: "Cómo habla", descripcion: "Su voz y lo que nunca dice.", pregunta: "¿Cómo quieres que hable {nombre}?" },
  {
    id: "reglas",
    titulo: "Horario y reglas",
    corto: "Horario",
    descripcion: "Cuándo atiende tu equipo y cuándo pasa a una persona.",
    pregunta: "¿Cuándo atiende tu equipo?",
  },
  {
    id: "habilidades",
    titulo: "Habilidades",
    descripcion: "Qué sabe hacer, qué acciones usa y qué datos pide.",
    pregunta: "¿Qué sabe hacer {nombre}?",
  },
  { id: "flujo", titulo: "Flujo de atención", corto: "Flujo", descripcion: "Las etapas con las que atiende.", pregunta: "¿Con qué pasos atiende {nombre}?" },
  {
    id: "conocimiento",
    titulo: "Conocimiento y datos",
    corto: "Conocimiento",
    descripcion: "Cuánto recuerda y si responde con tus documentos.",
    pregunta: "¿Qué recuerda y qué conoce {nombre}?",
  },
  { id: "probar", titulo: "Pruébalo", descripcion: "Escríbele como un cliente.", pregunta: "Pruébalo antes de publicar" },
  { id: "publicar", titulo: "Publicar", descripcion: "Dónde atiende y su nueva versión.", pregunta: "¿Dónde atiende {nombre}?" },
];

/** La pregunta del paso con el nombre del agente (sin nombre, «tu agente»). */
export function preguntaDelPaso(id: PasoId, nombre: string): string {
  const paso = PASOS.find((p) => p.id === id) ?? PASOS[0];
  return paso.pregunta.replace("{nombre}", nombre.trim() || "tu agente");
}

/** Ids de los pasos del editor anterior (`?paso=`), para que los enlaces viejos sigan abriendo algo. */
const PASOS_DE_ANTES: Record<string, PasoId> = {
  modelo: "publicar",
  superpoderes: "habilidades",
  acciones: "habilidades",
  datos: "habilidades",
  memoria: "conocimiento",
};

/** El paso de `?paso=`: uno de los ocho, uno de antes traducido, o ninguno. */
export function pasoDesdeParametro(valor: string | undefined): PasoId | undefined {
  if (!valor) return undefined;
  if (PASOS.some((p) => p.id === valor)) return valor as PasoId;
  return PASOS_DE_ANTES[valor];
}

export const MIN_FRASES_POR_DEFECTO = 3;
export const MAX_FRASES_PROPIAS = 50;
export const ALCANCES_DE_MEMORIA = [
  { id: "customer", label: "Lo que sabe del cliente" },
  { id: "connection", label: "Lo que pasó en esta conexión" },
  { id: "tenant", label: "Lo que sabe el negocio" },
] as const;

export type Contenido = Record<string, unknown>;

/** Flujo de atención del agente (ADR-0195): secciones con sus acciones, fuera del AgentSpec. */
export type FlujoSeccion = { id: string; label: string; purpose: string; tools: string[] };
export type FlujoDelAgente = { sections: FlujoSeccion[] };
export type AccionDelFlujo = Pick<AgentAction, "tool" | "group" | "enabled" | "by_superpower">;

export const FLUJO_VACIO: FlujoDelAgente = { sections: [] };

/** `GET /admin/agents/{id}/flow` → estado tipado; tolera un body vacío o viejo. */
export function flujoDesdeApi(raw: unknown): FlujoDelAgente {
  const cuerpo = objeto(raw);
  const secciones = Array.isArray(cuerpo.sections) ? cuerpo.sections : [];
  const sections: FlujoSeccion[] = [];
  for (const seccion of secciones) {
    const s = objeto(seccion);
    const id = typeof s.id === "string" ? s.id : "";
    const label = typeof s.label === "string" ? s.label : "";
    if (!id || !label) continue;
    sections.push({
      id,
      label,
      purpose: typeof s.purpose === "string" ? s.purpose : "",
      tools: textos(s.tools),
    });
  }
  return { sections };
}

/** Id estable y único para una sección nueva, a partir de su etiqueta. */
export function idDeSeccion(label: string, existentes: Iterable<string>): string {
  const base = normalizarFrase(label).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "seccion";
  const usados = new Set(existentes);
  let id = base;
  let n = 2;
  while (usados.has(id)) id = `${base}_${n++}`.slice(0, 40);
  return id;
}

export type SuperpoderEnEditor = { activo: boolean; frases: string[] };

export type EstadoDelEditor = {
  nombre: string;
  descripcion: string;
  heredarVoz: boolean;
  largoMaximo: number;
  frasesProhibidas: string[];
  modelo: string;
  temperatura: number;
  superpoderes: Record<string, SuperpoderEnEditor>;
  /** Acciones del agente por nombre (`tools`), sin la de conocimiento (fase 5a, ADR-0190). */
  acciones: Record<string, AccionEnEditor>;
  turnosDeMemoria: number;
  alcances: string[];
  /** Documentos del negocio (HU-AOS-49): la tool, el playbook y el bloque `knowledge`. */
  conocimiento: ConocimientoEnEditor;
  /** Flujo de atención del agente (ADR-0195), versionado aparte del AgentSpec. */
  flujo: FlujoDelAgente;
};

type Ref = { id: string; version: string; overrides?: { examples?: string[]; description?: string | null } };

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function refs(contenido: Contenido): Ref[] {
  return (Array.isArray(contenido.procedures) ? contenido.procedures : []).filter(
    (r): r is Ref => typeof objeto(r).id === "string" && typeof objeto(r).version === "string",
  );
}

/** Estado del formulario desde el agente y su borrador. */
export function estadoDesdeBorrador(
  agente: { name: string; description: string },
  contenido: Contenido,
  catalogo: Superpower[],
  flujo: FlujoDelAgente = FLUJO_VACIO,
): EstadoDelEditor {
  const persona = objeto(contenido.persona);
  const modelo = objeto(contenido.model);
  const memoria = objeto(contenido.memory);
  const declarados = new Map(refs(contenido).map((r) => [r.id, r]));
  const superpoderes: Record<string, SuperpoderEnEditor> = {};
  for (const poder of catalogo) {
    const ref = declarados.get(poder.id);
    superpoderes[poder.id] = { activo: Boolean(ref), frases: textos(ref?.overrides?.examples) };
  }
  // Un superpoder declarado que el negocio ya no ofrece se conserva (la API dirá por qué no publica).
  for (const ref of declarados.values()) {
    if (!superpoderes[ref.id]) superpoderes[ref.id] = { activo: true, frases: textos(ref.overrides?.examples) };
  }
  return {
    nombre: agente.name,
    descripcion: agente.description,
    heredarVoz: persona.inheritConnectionVoice !== false,
    largoMaximo: typeof persona.maxLength === "number" ? persona.maxLength : 500,
    frasesProhibidas: textos(persona.forbiddenPhrases),
    modelo: typeof modelo.primary === "string" ? modelo.primary : "",
    temperatura: typeof modelo.temperature === "number" ? modelo.temperature : 0.3,
    superpoderes,
    acciones: accionesDesdeContenido(contenido),
    turnosDeMemoria: typeof memoria.shortTermTurns === "number" ? memoria.shortTermTurns : 30,
    alcances: Array.isArray(memoria.readScopes) ? textos(memoria.readScopes) : ["customer", "connection", "tenant"],
    conocimiento: conocimientoDesdeContenido(contenido),
    flujo,
  };
}

/**
 * Superpoderes marcados que el catálogo del agente no ofrece: de otro enfoque o de una habilidad que el
 * negocio ya no tiene. La API no los deja publicar (`superpoder_fuera_de_enfoque` o `superpoder_no_disponible`),
 * así que el editor tiene que dejarlos quitar.
 */
export function superpoderesFueraDelEnfoque(estado: EstadoDelEditor, catalogo: Superpower[]): string[] {
  const ofrecidos = new Set(catalogo.map((p) => p.id));
  return Object.entries(estado.superpoderes)
    .filter(([id, poder]) => poder.activo && !ofrecidos.has(id))
    .map(([id]) => id);
}

/** Nombre legible de un superpoder que el catálogo no trae: `pack_commerce.tomar_pedido` → «Tomar pedido». */
export function nombreDeSuperpoder(id: string): string {
  const corto = (id.split(".")[1] ?? id).replace(/_/g, " ").trim();
  return corto.charAt(0).toUpperCase() + corto.slice(1);
}

/** Rango compatible `^M.0` de una versión publicada (la regla del core). */
export function rangoCompatible(version: string): string {
  const mayor = version.split(".")[0] || "1";
  return `^${mayor}.0`;
}

function limpias(frases: string[]): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const frase of frases) {
    const texto = frase.trim();
    if (!texto || vistas.has(claveDeFrase(texto))) continue;
    vistas.add(claveDeFrase(texto));
    salida.push(texto);
  }
  return salida;
}

/** Contenido del borrador con los cambios del editor; el resto queda como estaba. */
export function contenidoDesdeEstado(base: Contenido, estado: EstadoDelEditor, catalogo: Superpower[]): Contenido {
  const anteriores = new Map(refs(base).map((r) => [r.id, r]));
  const orden = [...catalogo.map((p) => p.id), ...[...anteriores.keys()].filter((id) => !catalogo.some((p) => p.id === id))];
  const procedures: Ref[] = [];
  for (const id of orden) {
    const enEditor = estado.superpoderes[id];
    if (!enEditor?.activo) continue;
    const anterior = anteriores.get(id);
    const poder = catalogo.find((p) => p.id === id);
    const version = anterior?.version ?? (poder ? rangoCompatible(poder.version) : null);
    if (!version) continue;
    const frases = limpias(enEditor.frases).slice(0, MAX_FRASES_PROPIAS);
    const descripcion = anterior?.overrides?.description;
    const overrides = {
      ...(frases.length > 0 ? { examples: frases } : {}),
      ...(descripcion ? { description: descripcion } : {}),
    };
    procedures.push({ id, version, ...(Object.keys(overrides).length > 0 ? { overrides } : {}) });
  }
  return aplicarConocimiento({
    ...base,
    persona: {
      ...objeto(base.persona),
      inheritConnectionVoice: estado.heredarVoz,
      maxLength: estado.largoMaximo,
      forbiddenPhrases: limpias(estado.frasesProhibidas),
    },
    model: { ...objeto(base.model), primary: estado.modelo, temperature: estado.temperatura },
    procedures,
    ...(Array.isArray(base.tools) ? { tools: aplicarAcciones(base.tools, estado.acciones ?? {}) } : {}),
    memory: { ...objeto(base.memory), shortTermTurns: estado.turnosDeMemoria, readScopes: estado.alcances },
  }, estado.conocimiento);
}

/** Minúsculas, sin tildes ni signos, espacios simples (como `textos.normalizar` del core). */
export function normalizarFrase(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Clave para decidir si dos frases son la misma: la normalizada o, si queda vacía (solo emojis o
 * símbolos), el texto recortado en minúsculas. Así «👍» y «🙏» no se toman como repetidas.
 */
export function claveDeFrase(texto: string): string {
  return normalizarFrase(texto) || texto.trim().toLowerCase();
}

/** Frases distintas de un superpoder: las de la habilidad más las propias (una copia no suma). */
export function frasesDistintas(poder: Pick<Superpower, "phrases">, propias: string[]): number {
  const todas = new Set([...poder.phrases, ...propias].map(normalizarFrase).filter(Boolean));
  return todas.size;
}

export type Errores = Record<string, string>;

/** Errores del paso, con las mismas claves que la API (`procedures[i].overrides.examples`). */
export function erroresDelPaso(
  paso: PasoId,
  estado: EstadoDelEditor,
  catalogo: Superpower[],
  opciones: { minFrases: number; conexiones?: string[] } = { minFrases: MIN_FRASES_POR_DEFECTO },
): Errores {
  const errores: Errores = {};
  if (paso === "identidad" && !estado.nombre.trim()) errores.name = "Ponle un nombre a tu agente.";
  if (paso === "habilidades") {
    const activos = catalogo.filter((p) => estado.superpoderes[p.id]?.activo);
    if (activos.length === 0) errores.procedures = "Marca al menos un superpoder para este agente.";
    activos.forEach((poder, i) => {
      const total = frasesDistintas(poder, estado.superpoderes[poder.id]?.frases ?? []);
      if (total < opciones.minFrases) {
        errores[`procedures[${i}].overrides.examples`] =
          `«${poder.title}» necesita al menos ${opciones.minFrases} frases distintas de clientes: agrega ${opciones.minFrases - total} más.`;
      }
    });
  }
  if (paso === "conocimiento" && estado.alcances.length === 0) errores["memory.readScopes"] = "Elige al menos qué puede recordar.";
  if (paso === "flujo") {
    const ids = new Set<string>();
    estado.flujo.sections.forEach((seccion, i) => {
      if (!seccion.label.trim()) errores[`flow.sections[${i}].label`] = "Ponle un nombre a la sección.";
      if (ids.has(seccion.id)) errores[`flow.sections[${i}].id`] = "Esta sección está repetida.";
      ids.add(seccion.id);
    });
  }
  if (paso === "publicar" && (opciones.conexiones ?? []).length === 0) {
    errores.connection_ids = "Elige al menos una conexión donde instalar el agente.";
  }
  return errores;
}

/** El paso al que pertenece un campo con error de la API. */
export function pasoDelCampo(campo: string): PasoId {
  if (campo === "name" || campo === "description") return "identidad";
  if (campo.startsWith("persona")) return "voz";
  // El modelo ya no tiene paso (HU-AOS-79): si la API lo nombra, se ve en Publicar.
  if (campo.startsWith("model")) return "publicar";
  if (campo.startsWith("tools") || campo.startsWith("datos")) return "habilidades";
  if (campo.startsWith("procedures") || campo.startsWith("playbooks")) return "habilidades";
  if (campo.startsWith("flow")) return "flujo";
  if (campo.startsWith("memory") || campo.startsWith("knowledge")) return "conocimiento";
  return "publicar";
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Los pasos con cambios sin guardar (la marca «con cambios» de la barra). */
export function pasosConCambios(estado: EstadoDelEditor, guardado: EstadoDelEditor): Set<PasoId> {
  const pasos = new Set<PasoId>();
  if (estado.nombre !== guardado.nombre || estado.descripcion !== guardado.descripcion) pasos.add("identidad");
  if (
    estado.heredarVoz !== guardado.heredarVoz ||
    estado.largoMaximo !== guardado.largoMaximo ||
    !igual(estado.frasesProhibidas, guardado.frasesProhibidas)
  ) {
    pasos.add("voz");
  }
  if (!igual(estado.superpoderes, guardado.superpoderes) || !igual(estado.acciones, guardado.acciones)) pasos.add("habilidades");
  if (!igual(estado.flujo, guardado.flujo)) pasos.add("flujo");
  if (
    estado.turnosDeMemoria !== guardado.turnosDeMemoria ||
    !igual(estado.alcances, guardado.alcances) ||
    !igual(estado.conocimiento, guardado.conocimiento)
  ) {
    pasos.add("conocimiento");
  }
  return pasos;
}

/**
 * Los errores de `procedures[i]` de la API usan el índice dentro de los superpoderes ACTIVOS (el
 * orden del contenido guardado): se traducen al id del superpoder para mostrarlos junto a él.
 */
export function erroresPorSuperpoder(errores: Errores, contenido: Contenido): Record<string, string> {
  const ids = refs(contenido).map((r) => r.id);
  const salida: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const m = /^procedures\[(\d+)\]/.exec(campo);
    const id = m ? ids[Number(m[1])] : undefined;
    if (id) salida[id] = salida[id] ? `${salida[id]} ${mensaje}` : mensaje;
  }
  return salida;
}

/** Resultado de publicar en una conexión, en palabras del dueño. */
export function textoDeConexionPublicada(c: {
  instance: string;
  release_number: number | null;
  release_created: boolean | null;
  error: string | null;
}): string {
  if (c.error) return `No se pudo preparar (${c.error}). Vuelve a publicar para reintentar.`;
  const instalado = c.instance === "created" ? "Agente instalado" : "El agente ya estaba instalado";
  const version = c.release_created
    ? `la conexión tiene lista su configuración n.º ${c.release_number}, sin activar`
    : `la configuración n.º ${c.release_number} de la conexión ya estaba lista`;
  return `${instalado}; ${version}.`;
}

// ------------------------------------------------------------------ lo que el editor muestra del negocio

/** Lo que el editor muestra del negocio y no edita: su voz, su horario y cuándo pasa a una persona. */
export type NegocioDelEditor = {
  nombre: string;
  /** La voz de Configuración para la vista previa; null si no se pudo leer. */
  voz: VozDeVistaPrevia | null;
  /** «Cercano · calidez 4 · pocos emojis». */
  resumenDeVoz: string | null;
  horario: string | null;
  motivos: string[] | null;
};

/** Voz, horario y reglas del negocio desde su identidad (`GET /admin/settings`); sin ella, todo null. */
export function negocioDesdeIdentidad(nombre: string, identidad: IdentitySettings | null): NegocioDelEditor {
  if (!identidad) return { nombre, voz: null, resumenDeVoz: null, horario: null, motivos: null };
  const e = estadoDesdeIdentidad(identidad);
  const voz: VozDeVistaPrevia = { tono: e.tono, calidez: e.calidez, emojis: e.emojis, largo: e.largo };
  const tono = TONOS.find((x) => x.id === e.tono)?.titulo ?? e.tono;
  const emojis = (EMOJIS.find((x) => x.id === e.emojis)?.titulo ?? "").toLocaleLowerCase("es-CO");
  const largo = (LARGOS.find((x) => x.id === e.largo)?.titulo ?? "").toLocaleLowerCase("es-CO");
  return {
    nombre,
    voz,
    resumenDeVoz: `${tono} · calidez ${e.calidez} · emojis: ${emojis} · respuestas ${largo}.`,
    horario: e.horario ? resumenDeHorario(e.horario) : "",
    motivos: MOTIVOS_DE_ESCALAR.filter((m) => e.motivos.includes(m.id)).map((m) => m.titulo),
  };
}
