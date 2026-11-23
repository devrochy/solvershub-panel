import type { components } from "@/lib/api/schema";

/**
 * «Reglas» y «Tools HTTP» del editor del agente (HU-AOS-97, D-78 decisión 4): lo que antes se editaba para todo el
 * negocio en Configuración vive ahora en cada agente (`AgentSpecV3.guardrails` y `.declarativeTools`). Aquí está la
 * forma del formulario y su conversión a la API; la validación de verdad la hace el backend (error por campo).
 */

export type ReglasDelAgente = components["schemas"]["AgentGuardrailsOut"];
export type ToolsHttpDelAgente = components["schemas"]["AgentDeclarativeToolsOut"];
type ReglaApi = components["schemas"]["GuardrailRule"];
type ToolApi = components["schemas"]["DeclarativeTool"];

// ------------------------------------------------------------------ reglas
export type TipoDeRegla = ReglaApi["kind"];
export type AccionDeRegla = NonNullable<ReglaApi["action"]>;

export const TIPOS_DE_REGLA: { id: TipoDeRegla; titulo: string; ayuda: string }[] = [
  { id: "forbidden_phrase", titulo: "Frase prohibida", ayuda: "El agente nunca dice estas frases." },
  {
    id: "required_tool",
    titulo: "Acción obligatoria",
    ayuda: "Si el agente dice una de estas frases, antes tiene que haber usado la acción.",
  },
  { id: "max_length", titulo: "Largo máximo", ayuda: "La respuesta no pasa de este número de caracteres." },
];

export const ACCIONES_DE_REGLA: { id: AccionDeRegla; titulo: string }[] = [
  { id: "retry", titulo: "Corregir y volver a intentar" },
  { id: "escalate", titulo: "Pasar a una persona" },
];

export type ReglaForm = {
  name: string;
  kind: TipoDeRegla;
  action: AccionDeRegla;
  phrases: string[];
  tool: string;
  value: string;
};

export function reglaVacia(kind: TipoDeRegla = "forbidden_phrase"): ReglaForm {
  return { name: "", kind, action: "retry", phrases: [], tool: "", value: "" };
}

export function reglaDesdeApi(r: ReglaApi): ReglaForm {
  return {
    name: r.name,
    kind: r.kind,
    action: r.action ?? "retry",
    phrases: [...(r.phrases ?? [])],
    tool: r.tool ?? "",
    value: r.value == null ? "" : String(r.value),
  };
}

/** Solo los campos de su tipo: una frase de una regla de largo no viaja. */
export function reglaParaApi(r: ReglaForm): Record<string, unknown> {
  const base = { name: r.name.trim(), kind: r.kind, action: r.action };
  if (r.kind === "max_length") return { ...base, value: Number(r.value) };
  if (r.kind === "required_tool") return { ...base, phrases: r.phrases, tool: r.tool.trim() };
  return { ...base, phrases: r.phrases };
}

/** Lo que impide guardar una regla en el panel, o `null` (el backend vuelve a validar). */
export function problemaDeRegla(r: ReglaForm): string | null {
  if (!r.name.trim()) return "Ponle un nombre a la regla.";
  if (r.name.trim().length > 60) return "El nombre de la regla tiene hasta 60 caracteres.";
  if (r.kind !== "max_length" && r.phrases.length === 0) return "Agrega al menos una frase.";
  if (r.kind === "required_tool" && !r.tool.trim()) return "Elige la acción obligatoria.";
  if (r.kind === "max_length") {
    const n = Number(r.value);
    if (!Number.isInteger(n) || n < 1 || n > 100_000) return "El largo máximo va de 1 a 100.000 caracteres.";
  }
  return null;
}

// ------------------------------------------------------------------ tools HTTP
/** Headers que nunca llevan un valor escrito: van como secreto (el contrato los rechaza en texto). */
export const HEADERS_SENSIBLES = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "proxy-authorization",
  "api-key",
  "x-auth-token",
  "x-access-token",
  "x-api-token",
  "private-token",
]);

export function esSensible(header: string): boolean {
  return HEADERS_SENSIBLES.has(header.trim().toLowerCase());
}

export type HeaderForm = {
  nombre: string;
  tipo: "texto" | "secreto";
  /** Texto del header (tipo texto). */
  valor: string;
  /** Nombre del secreto (tipo secreto). */
  secreto: string;
  /** Valor nuevo del secreto, de solo escritura: vacío = usar el que ya está guardado. */
  valorSecreto: string;
};

export type ToolForm = {
  name: string;
  description: string;
  method: "GET" | "POST";
  url: string;
  dominios: string;
  headers: HeaderForm[];
  parameters: string;
  body: string;
};

const PARAMETROS_VACIOS = { type: "object", properties: {} };

export function toolVacia(): ToolForm {
  return {
    name: "",
    description: "",
    method: "GET",
    url: "https://",
    dominios: "",
    headers: [],
    parameters: JSON.stringify(PARAMETROS_VACIOS, null, 2),
    body: "",
  };
}

export function headerVacio(): HeaderForm {
  return { nombre: "", tipo: "texto", valor: "", secreto: "", valorSecreto: "" };
}

export function toolDesdeApi(t: ToolApi): ToolForm {
  return {
    name: t.name,
    description: t.description ?? "",
    method: t.method ?? "GET",
    url: t.url,
    dominios: (t.allowedDomains ?? []).join(", "),
    headers: Object.entries(t.headers ?? {}).map(([nombre, v]) =>
      typeof v === "string"
        ? { ...headerVacio(), nombre, valor: v }
        : { ...headerVacio(), nombre, tipo: "secreto" as const, secreto: v.secret },
    ),
    parameters: JSON.stringify(t.parameters ?? PARAMETROS_VACIOS, null, 2),
    body: t.body && Object.keys(t.body).length ? JSON.stringify(t.body, null, 2) : "",
  };
}

function json(texto: string, vacio: unknown): unknown {
  return texto.trim() ? JSON.parse(texto) : vacio;
}

export type ToolsParaApi = { tools: Record<string, unknown>[]; secrets: Record<string, string> };

/**
 * Las tools en la forma de la API y los valores nuevos de los secretos (solo los escritos). Lanza `Error` con el
 * mensaje para el usuario si un JSON no se puede leer o un mismo secreto trae dos valores distintos.
 */
export function toolsParaApi(tools: ToolForm[]): ToolsParaApi {
  const secrets: Record<string, string> = {};
  const salida = tools.map((t, i) => {
    let parameters: unknown;
    let body: unknown;
    try {
      parameters = json(t.parameters, PARAMETROS_VACIOS);
      body = json(t.body, {});
    } catch {
      throw new Error(`La tool ${i + 1} tiene un JSON que no se puede leer en parámetros o cuerpo.`);
    }
    const headers: Record<string, string | { secret: string }> = {};
    for (const h of t.headers) {
      const nombre = h.nombre.trim();
      if (!nombre) continue;
      if (h.tipo === "secreto") {
        const secreto = h.secreto.trim();
        headers[nombre] = { secret: secreto };
        if (h.valorSecreto) {
          if (secrets[secreto] !== undefined && secrets[secreto] !== h.valorSecreto) {
            throw new Error(`El secreto «${secreto}» tiene dos valores distintos: deja uno solo.`);
          }
          secrets[secreto] = h.valorSecreto;
        }
      } else {
        headers[nombre] = h.valor;
      }
    }
    return {
      name: t.name.trim(),
      description: t.description.trim(),
      method: t.method,
      url: t.url.trim(),
      allowedDomains: t.dominios
        .split(/[\s,]+/)
        .map((d) => d.trim())
        .filter(Boolean),
      headers,
      parameters,
      body,
    };
  });
  return { tools: salida, secrets };
}

/** Un nombre de secreto a partir del de la tool: `consultar_envio` → `consultar_envio_token`. */
export function secretoSugerido(tool: string): string {
  const base = tool.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 54);
  return `${base || "tool"}_token`;
}

/** Los errores por campo de la API (`declarativeTools[i]…`, `guardrails[i]…`, `secrets.<n>`) agrupados por fila. */
export function erroresPorFila(fields: Record<string, string> | undefined, prefijo: string): Map<number, string[]> {
  const filas = new Map<number, string[]>();
  for (const [campo, mensaje] of Object.entries(fields ?? {})) {
    const m = campo.match(new RegExp(`^${prefijo}\\[(\\d+)\\]`));
    if (!m) continue;
    const i = Number(m[1]);
    filas.set(i, [...(filas.get(i) ?? []), mensaje]);
  }
  return filas;
}

/** Errores que no son de una fila (p. ej. `secrets.<nombre>` o la lista entera). */
export function erroresGenerales(fields: Record<string, string> | undefined, prefijo: string): string[] {
  return Object.entries(fields ?? {})
    .filter(([campo]) => !new RegExp(`^${prefijo}\\[\\d+\\]`).test(campo))
    .map(([, mensaje]) => mensaje);
}
