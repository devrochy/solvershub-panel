/**
 * Conocimiento del agente (HU-AOS-49, ADR-0145): lógica pura de la pestaña «Conocimiento» de la
 * ficha y de la sección del editor. Estados de los documentos, motivos de falla, tipos de archivo
 * admitidos y lo que el borrador del agente tiene que declarar para usar sus documentos.
 */
import type { KnowledgeDocument } from "@/lib/api/types";

export type EstadoDeDocumento = KnowledgeDocument["estado"];
type Tono = "neutral" | "info" | "success" | "warning" | "danger";

const ESTADOS: Record<string, { label: string; tono: Tono }> = {
  pendiente: { label: "En cola", tono: "neutral" },
  procesando: { label: "Procesando", tono: "info" },
  listo: { label: "Listo", tono: "success" },
  fallido: { label: "No se pudo leer", tono: "danger" },
};

export function estadoDeDocumento(estado: string): { label: string; tono: Tono } {
  return ESTADOS[estado] ?? { label: "Otro estado", tono: "neutral" };
}

const MOTIVOS: Record<string, string> = {
  sin_texto: "No tiene texto que leer (¿es un PDF escaneado?). Súbelo como PDF con texto o como DOCX.",
  muy_grande: "Es muy largo: pasa de 300 páginas o de 2.000 fragmentos. Divídelo en partes.",
  formato: "El archivo está dañado o no es del tipo que dice ser.",
  limite_plan: "Tu plan no admite más documentos.",
  proveedor: "El servicio que lee los documentos no respondió. Vuelve a procesarlo en unos minutos.",
  interno: "Algo falló al procesarlo. Vuelve a intentarlo; si se repite, avísanos.",
};

export function motivoDeFalla(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  return MOTIVOS[codigo] ?? "No se pudo procesar. Vuelve a intentarlo.";
}

/** Mientras haya documentos en cola o procesando, la pestaña se refresca sola. */
export function hayEnProceso(documentos: Pick<KnowledgeDocument, "estado">[]): boolean {
  return documentos.some((d) => d.estado === "pendiente" || d.estado === "procesando");
}

export const INTERVALO_DE_REVISION_MS = 4_000;
export const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Tipos admitidos: los MIME que mandan los navegadores más los genéricos que usan para `.md`
 * (vacío u `octet-stream`). La API confirma el tipo por el contenido.
 */
export const EXTENSIONES = [".pdf", ".docx", ".txt", ".md"] as const;
const MIME_POR_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto >= 0 ? nombre.slice(punto).toLowerCase() : "";
}

/** ¿El archivo es de un tipo admitido? Por extensión, que es lo que el dueño ve. */
export function archivoAdmitido(archivo: { name: string }): boolean {
  return (EXTENSIONES as readonly string[]).includes(extensionDe(archivo.name));
}

export const TIPOS_ACEPTADOS = [...EXTENSIONES, ...Object.values(MIME_POR_EXTENSION)];

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

export function detalleDeDocumento(d: Pick<KnowledgeDocument, "paginas" | "num_fragmentos" | "bytes" | "estado">): string {
  const partes = [tamanoLegible(d.bytes)];
  if (d.paginas) partes.push(`${d.paginas} ${d.paginas === 1 ? "página" : "páginas"}`);
  if (d.estado === "listo") partes.push(`${d.num_fragmentos} ${d.num_fragmentos === 1 ? "fragmento" : "fragmentos"}`);
  return partes.join(" · ");
}

// ------------------------------------------------------------------ borrador del agente
export const TOOL = "buscar_conocimiento";
export const PLAYBOOK = "conocimiento";
export const PACK = "pack_knowledge";

export type ModoDeBusqueda = "hibrida" | "semantica";

export type ConocimientoEnEditor = {
  activo: boolean;
  modo: ModoDeBusqueda;
  fragmentos: number;
  /** null = el umbral calibrado de cada modo (ADR-0145). */
  umbral: number | null;
};

export const FRAGMENTOS_POR_DEFECTO = 4;
export const MAX_FRAGMENTOS = 8;

export const MODOS: { value: ModoDeBusqueda; label: string; description: string }[] = [
  {
    value: "hibrida",
    label: "Híbrida (recomendada)",
    description: "Busca por significado y por palabras exactas: encuentra referencias, nombres y precios.",
  },
  {
    value: "semantica",
    label: "Por significado",
    description: "Solo por significado. Útil si tus documentos están escritos con otras palabras que tus clientes.",
  },
];

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function lista(valor: unknown): Record<string, unknown>[] {
  return Array.isArray(valor) ? valor.filter((v) => v && typeof v === "object" && !Array.isArray(v)) : [];
}

/** ¿El contenido del agente declara la búsqueda (la tool habilitada)? */
export function usaConocimiento(contenido: Record<string, unknown>): boolean {
  return lista(contenido.tools).some((t) => t.tool === TOOL && t.enabled !== false);
}

export function conocimientoDesdeContenido(contenido: Record<string, unknown>): ConocimientoEnEditor {
  const bloque = objeto(contenido.knowledge);
  const fragmentos = typeof bloque.topK === "number" ? bloque.topK : FRAGMENTOS_POR_DEFECTO;
  return {
    activo: usaConocimiento(contenido),
    modo: bloque.mode === "semantica" ? "semantica" : "hibrida",
    fragmentos: Math.min(MAX_FRAGMENTOS, Math.max(1, fragmentos)),
    umbral: typeof bloque.minScore === "number" ? bloque.minScore : null,
  };
}

/**
 * Aplica la sección al contenido: con la búsqueda activa, la tool, el playbook del pack y el
 * bloque `knowledge`; sin ella, los quita. El resto de tools y playbooks queda como estaba.
 */
export function aplicarConocimiento(
  contenido: Record<string, unknown>,
  conocimiento: ConocimientoEnEditor,
): Record<string, unknown> {
  const otrasTools = lista(contenido.tools).filter((t) => t.tool !== TOOL);
  const otrosPlaybooks = lista(contenido.playbooks).filter((p) => p.name !== PLAYBOOK);
  const resto = { ...contenido };
  delete resto.knowledge;
  if (!conocimiento.activo) {
    return { ...resto, tools: otrasTools, playbooks: otrosPlaybooks };
  }
  const anterior = lista(contenido.tools).find((t) => t.tool === TOOL);
  const playbookAnterior = lista(contenido.playbooks).find((p) => p.name === PLAYBOOK);
  return {
    ...resto,
    tools: [...otrasTools, { ...(anterior ?? {}), tool: TOOL, enabled: true }],
    playbooks: [
      ...otrosPlaybooks,
      playbookAnterior ?? {
        name: PLAYBOOK,
        description: "Cómo responder con los documentos del negocio",
        pack: PACK,
      },
    ],
    knowledge: {
      mode: conocimiento.modo,
      topK: conocimiento.fragmentos,
      ...(conocimiento.umbral !== null ? { minScore: conocimiento.umbral } : {}),
    },
  };
}
