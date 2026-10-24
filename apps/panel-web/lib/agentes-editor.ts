/**
 * Editor de agentes desde plantillas (HU-AOS-24): lógica pura del formulario por pasos.
 *
 * El borrador es un AgentSpec v3 (`agentspec/3`). El editor solo toca lo que el dueño ve
 * (persona, modelo, superpoderes y sus frases, memoria) y conserva intacto el resto del
 * contenido (guardrails, declarativas, tools y playbooks ajenos...). Las reglas que se repiten aquí
 * las vuelve a exigir la API al publicar (`POST /admin/agents/{id}/publish`); este módulo solo
 * adelanta los mismos errores junto a cada campo.
 */
import type { Superpower } from "@/lib/api/types";
import { aplicarConocimiento, conocimientoDesdeContenido, type ConocimientoEnEditor } from "@/lib/conocimiento";

export type PasoId = "identidad" | "modelo" | "superpoderes" | "memoria" | "publicar";

export const PASOS: { id: PasoId; titulo: string; descripcion: string }[] = [
  { id: "identidad", titulo: "Identidad", descripcion: "Nombre y cómo habla tu agente." },
  { id: "modelo", titulo: "Proveedor y modelo", descripcion: "La IA que usa y lo que cuesta." },
  { id: "superpoderes", titulo: "Superpoderes", descripcion: "Qué sabe hacer y con qué frases lo reconoce." },
  { id: "memoria", titulo: "Memoria y conocimiento", descripcion: "Cuánto recuerda y si responde con tus documentos." },
  { id: "publicar", titulo: "Publicar", descripcion: "Dónde atiende y su nueva versión." },
];

export const MIN_FRASES_POR_DEFECTO = 3;
export const MAX_FRASES_PROPIAS = 50;
export const ALCANCES_DE_MEMORIA = [
  { id: "customer", label: "Lo que sabe del cliente" },
  { id: "connection", label: "Lo que pasó en esta conexión" },
  { id: "tenant", label: "Lo que sabe el negocio" },
] as const;

export type Contenido = Record<string, unknown>;

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
  turnosDeMemoria: number;
  alcances: string[];
  /** Documentos del negocio (HU-AOS-49): la tool, el playbook y el bloque `knowledge`. */
  conocimiento: ConocimientoEnEditor;
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
    turnosDeMemoria: typeof memoria.shortTermTurns === "number" ? memoria.shortTermTurns : 30,
    alcances: Array.isArray(memoria.readScopes) ? textos(memoria.readScopes) : ["customer", "connection", "tenant"],
    conocimiento: conocimientoDesdeContenido(contenido),
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
    if (!texto || vistas.has(normalizarFrase(texto))) continue;
    vistas.add(normalizarFrase(texto));
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
  if (paso === "modelo" && !estado.modelo) errores["model.primary"] = "Elige un modelo.";
  if (paso === "superpoderes") {
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
  if (paso === "memoria" && estado.alcances.length === 0) errores["memory.readScopes"] = "Elige al menos qué puede recordar.";
  if (paso === "publicar" && (opciones.conexiones ?? []).length === 0) {
    errores.connection_ids = "Elige al menos una conexión donde instalar el agente.";
  }
  return errores;
}

/** El paso al que pertenece un campo con error de la API. */
export function pasoDelCampo(campo: string): PasoId {
  if (campo === "name" || campo === "description" || campo.startsWith("persona")) return "identidad";
  if (campo.startsWith("model")) return "modelo";
  if (campo.startsWith("procedures") || campo.startsWith("tools") || campo.startsWith("playbooks")) return "superpoderes";
  if (campo.startsWith("memory") || campo.startsWith("knowledge")) return "memoria";
  return "publicar";
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

/** Costo estimado por 1.000 turnos en texto; sin estimado, lo dice. */
export function textoDeCosto(estimado: number | null | undefined): string {
  if (estimado === null || estimado === undefined) return "Sin estimado: aún no hay conversaciones para calcularlo.";
  return `≈ US$${estimado.toLocaleString("es-CO", { maximumFractionDigits: 4 })} por cada 1.000 respuestas`;
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
