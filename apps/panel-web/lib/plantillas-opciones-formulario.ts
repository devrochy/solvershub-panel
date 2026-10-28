/**
 * Formulario de `args_fijos` generado desde el JSON Schema de `parameters` de una tool (HU-OPC-06).
 *
 * Pura: convierte el schema en un plan de campos que el componente pinta. Lo que no sabe pintar
 * (`oneOf`, `$ref` que no resuelve, objetos libres, listas de objetos…) cae a un campo de JSON
 * validado SOLO ese campo; si el schema entero no es un objeto con propiedades, cae a un editor
 * JSON del conjunto. Nunca lanza con un schema raro.
 */
export type Esquema = {
  $ref?: string;
  $defs?: Record<string, Esquema>;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, Esquema>;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: Esquema;
  additionalProperties?: boolean | Esquema;
  anyOf?: Esquema[];
  oneOf?: Esquema[];
  allOf?: Esquema[];
  "x-enumLabels"?: string[] | Record<string, string>;
  "x-widget"?: string;
};

type Base = {
  nombre: string;
  titulo: string;
  ayuda?: string;
  requerido: boolean;
};

export type Campo =
  | (Base & { tipo: "texto" | "textoLargo"; maxLength?: number })
  | (Base & { tipo: "numero" | "entero"; min?: number; max?: number })
  | (Base & { tipo: "booleano" })
  | (Base & { tipo: "elegir"; opciones: { valor: unknown; etiqueta: string }[] })
  | (Base & { tipo: "lista"; item: "texto" | "numero" })
  /** Objeto con propiedades conocidas: sus campos se pintan anidados. */
  | (Base & { tipo: "grupo"; campos: Campo[] })
  /** No se sabe pintar: se edita como JSON, validado. */
  | (Base & { tipo: "json"; motivo: string });

export type Plan = { tipo: "campos"; campos: Campo[] } | { tipo: "json"; motivo: string };

/** Profundidad máxima de objetos anidados que se pintan como grupo; más allá, JSON. */
const MAX_NIVEL = 2;

export function humanizar(nombre: string): string {
  const texto = nombre.replace(/_/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Resuelve un `$ref` local (`#/$defs/X` o `#/definitions/X`); undefined si no se puede. */
function resolverRef(ref: string, raiz: Esquema): Esquema | undefined {
  const m = /^#\/(\$defs|definitions)\/([^/]+)$/.exec(ref);
  if (!m) return undefined;
  const defs = (m[1] === "$defs" ? raiz.$defs : (raiz as { definitions?: Record<string, Esquema> }).definitions) ?? {};
  const destino = defs[decodeURIComponent(m[2])];
  return esObjeto(destino) ? (destino as Esquema) : undefined;
}

/** Tipo efectivo (sin `null`), si el campo admite nulo, y el esquema ya sin envoltorios `$ref`/`anyOf null`/`allOf` de uno. */
function aplanar(esquema: Esquema, raiz: Esquema, vuelta = 0): { esquema: Esquema; nulable: boolean } | null {
  if (vuelta > 6 || !esObjeto(esquema)) return null;
  if (esquema.$ref) {
    const destino = resolverRef(esquema.$ref, raiz);
    if (!destino) return null;
    const { $ref: _ref, ...resto } = esquema;
    void _ref;
    return aplanar({ ...destino, ...resto }, raiz, vuelta + 1);
  }
  if (esquema.allOf && esquema.allOf.length === 1) {
    const { allOf, ...resto } = esquema;
    return aplanar({ ...allOf[0], ...resto }, raiz, vuelta + 1);
  }
  const variantes = esquema.anyOf ?? esquema.oneOf;
  if (variantes) {
    const noNulas = variantes.filter((v) => !(esObjeto(v) && v.type === "null"));
    if (noNulas.length === 1 && noNulas.length < variantes.length) {
      const { anyOf: _a, oneOf: _o, ...resto } = esquema;
      void _a;
      void _o;
      const interno = aplanar({ ...noNulas[0], ...resto }, raiz, vuelta + 1);
      return interno ? { esquema: interno.esquema, nulable: true } : null;
    }
    return null;
  }
  if (Array.isArray(esquema.type)) {
    const tipos = esquema.type.filter((t) => t !== "null");
    if (tipos.length !== 1) return null;
    return { esquema: { ...esquema, type: tipos[0] }, nulable: tipos.length < esquema.type.length };
  }
  return { esquema, nulable: false };
}

function etiquetasDeEnum(esquema: Esquema): Record<string, string> {
  const crudas = esquema["x-enumLabels"];
  if (!crudas) return {};
  if (!Array.isArray(crudas)) return crudas;
  return Object.fromEntries((esquema.enum ?? []).map((v, i) => [String(v), crudas[i] ?? String(v)]));
}

function campoDe(nombre: string, original: Esquema, requerido: boolean, raiz: Esquema, nivel: number): Campo {
  const base = (e: Esquema, nulable = false): Base => ({
    nombre,
    titulo: e.title ?? humanizar(nombre),
    ...(e.description ? { ayuda: e.description } : {}),
    requerido: requerido && !nulable,
  });
  const aJson = (motivo: string, e: Esquema = original): Campo => ({ ...base(e), tipo: "json", motivo });

  const plano = aplanar(original, raiz);
  if (!plano) return aJson("Este campo tiene una forma que el formulario no pinta: escríbelo como JSON.");
  const { esquema: e, nulable } = plano;
  const b = base(e, nulable);

  if (e.enum || e.const !== undefined) {
    const valores = e.enum ?? [e.const];
    const etiquetas = etiquetasDeEnum(e);
    return { ...b, tipo: "elegir", opciones: valores.map((valor) => ({ valor, etiqueta: etiquetas[String(valor)] ?? String(valor) })) };
  }

  const tipo = typeof e.type === "string" ? e.type : e.properties ? "object" : undefined;
  switch (tipo) {
    case "string":
      return {
        ...b,
        tipo: e.format === "textarea" || e["x-widget"] === "textarea" || (e.maxLength ?? 0) > 200 ? "textoLargo" : "texto",
        ...(e.maxLength ? { maxLength: e.maxLength } : {}),
      };
    case "integer":
    case "number":
      return { ...b, tipo: tipo === "integer" ? "entero" : "numero", min: e.minimum, max: e.maximum };
    case "boolean":
      return { ...b, tipo: "booleano" };
    case "array": {
      const item = e.items ? aplanar(e.items, raiz) : null;
      const tipoItem = item && typeof item.esquema.type === "string" ? item.esquema.type : undefined;
      if (item && !item.esquema.enum && (tipoItem === "string" || tipoItem === "integer" || tipoItem === "number")) {
        return { ...b, tipo: "lista", item: tipoItem === "string" ? "texto" : "numero" };
      }
      return aJson("Esta lista no es de textos ni de números: escríbela como JSON.", e);
    }
    case "object": {
      const propiedades = e.properties;
      const libre = e.additionalProperties !== undefined && e.additionalProperties !== false;
      if (!propiedades || Object.keys(propiedades).length === 0 || libre) {
        return aJson("Este objeto es libre: escríbelo como JSON.", e);
      }
      if (nivel >= MAX_NIVEL) return aJson("Este objeto está muy anidado: escríbelo como JSON.", e);
      const pedidos = new Set(e.required ?? []);
      return {
        ...b,
        tipo: "grupo",
        campos: Object.entries(propiedades).map(([n, p]) => campoDe(n, p, pedidos.has(n), raiz, nivel + 1)),
      };
    }
    default:
      return aJson("No se reconoce el tipo de este campo: escríbelo como JSON.", e);
  }
}

/** El plan del formulario de una tool: campos por propiedad de `parameters`, o JSON si el schema no es pintable. */
export function planDeFormulario(parameters: unknown): Plan {
  if (!esObjeto(parameters)) return { tipo: "json", motivo: "La acción no declara sus argumentos: escríbelos como JSON." };
  const raiz = parameters as Esquema;
  const plano = aplanar(raiz, raiz);
  const esquema = plano?.esquema;
  if (!esquema) return { tipo: "json", motivo: "Los argumentos de esta acción tienen una forma que el formulario no pinta: escríbelos como JSON." };
  const propiedades = esquema.properties;
  if (!propiedades) {
    // Una tool sin argumentos: `{type: "object", properties: {}}` o `{}`; no hay nada que pedir.
    return esquema.type === "object" || Object.keys(esquema).length === 0 ? { tipo: "campos", campos: [] } : { tipo: "json", motivo: "Los argumentos de esta acción no son un objeto con propiedades: escríbelos como JSON." };
  }
  const pedidos = new Set(esquema.required ?? []);
  return { tipo: "campos", campos: Object.entries(propiedades).map(([n, p]) => campoDe(n, p, pedidos.has(n), raiz, 0)) };
}

// ------------------------------------------------------------------ valores
/** Texto de un valor para un `<input>`/`<textarea>` (listas: una por línea; json: indentado). */
export function valorATexto(campo: Pick<Campo, "tipo">, valor: unknown): string {
  if (valor === undefined || valor === null) return "";
  if (campo.tipo === "lista") return Array.isArray(valor) ? valor.join("\n") : String(valor);
  if (campo.tipo === "json") return typeof valor === "string" ? JSON.stringify(valor) : JSON.stringify(valor, null, 2);
  return String(valor);
}

/** Texto del input → valor del argumento. Vacío es `undefined`: el argumento se quita, no se manda en blanco. */
export function textoAValor(campo: Campo, texto: string): unknown {
  switch (campo.tipo) {
    case "numero":
    case "entero": {
      if (texto.trim() === "") return undefined;
      const n = Number(texto);
      return Number.isFinite(n) ? n : undefined;
    }
    case "lista": {
      const items = texto
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length === 0) return undefined;
      if (campo.item === "numero") {
        const numeros = items.map(Number);
        return numeros.every(Number.isFinite) ? numeros : undefined;
      }
      return items;
    }
    default:
      return texto === "" ? undefined : texto;
  }
}

export type JsonLeido = { ok: true; valor: unknown } | { ok: false };

/** Lee el texto de un campo JSON. Vacío es válido y vale «sin valor». */
export function leerJson(texto: string): JsonLeido {
  if (!texto.trim()) return { ok: true, valor: undefined };
  try {
    return { ok: true, valor: JSON.parse(texto) as unknown };
  } catch {
    return { ok: false };
  }
}

/** Lo mismo para el editor del conjunto: tiene que ser un objeto (los argumentos son nombre → valor). */
export function leerObjetoJson(texto: string): { ok: true; valor: Record<string, unknown> } | { ok: false; motivo: string } {
  const leido = leerJson(texto);
  if (!leido.ok) return { ok: false, motivo: "El JSON no es válido." };
  if (leido.valor === undefined) return { ok: true, valor: {} };
  if (!esObjeto(leido.valor)) return { ok: false, motivo: "Tiene que ser un objeto: { \"argumento\": valor }." };
  return { ok: true, valor: leido.valor };
}
