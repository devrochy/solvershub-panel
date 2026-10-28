import type { CatalogoConfig, OpcionConfig, ValorPosibleConfig } from "@/lib/api/types";

/**
 * Catálogo de opciones de Configuración (SPEC-37, ADR-0166): etiquetas, ayudas, valores y rangos
 * los sirve el backend. Este módulo solo los consulta y los presenta; no guarda listas de valores.
 */

export type OpcionesPorClave = ReadonlyMap<string, OpcionConfig>;

export function indexarCatalogo(catalogo: CatalogoConfig | null | undefined): OpcionesPorClave {
  return new Map((catalogo?.opciones ?? []).map((o) => [o.clave, o]));
}

/** «Natural · espera 15 s»: la etiqueta con su nota, nunca el identificador crudo. */
export function etiquetaDeValor(valor: ValorPosibleConfig): string {
  return valor.nota ? `${valor.etiqueta} · ${valor.nota}` : valor.etiqueta;
}

/**
 * Valores de una opción de elegir. Si el valor guardado no está en la lista (una fila antigua), se
 * conserva visible como «(valor actual)» para que guardar no lo cambie en silencio.
 */
export function valoresConActual(opcion: OpcionConfig, actual: string): ValorPosibleConfig[] {
  const valores = opcion.valores ?? [];
  if (!actual || valores.some((v) => v.valor === actual)) return valores;
  return [...valores, { valor: actual, etiqueta: actual, nota: "valor actual" }];
}

/** «Entre 1 y 10 puntos», o vacío si la opción no es numérica. */
export function rangoTexto(opcion: OpcionConfig): string {
  if (opcion.minimo == null || opcion.maximo == null) return "";
  const unidad = opcion.unidad ? ` ${opcion.unidad}` : "";
  return `Entre ${opcion.minimo} y ${opcion.maximo}${unidad}.`;
}

/** Ayuda de un campo: qué cambia, el ejemplo si lo hay y el rango si es numérico. */
export function ayudaDeOpcion(opcion: OpcionConfig): string {
  const partes = [opcion.explicacion.trim()];
  // El ejemplo ya puede traer su punto final: no se duplica.
  if (opcion.ejemplo) partes.push(`Ejemplo: ${opcion.ejemplo.trim().replace(/\.+$/, "")}.`);
  const rango = rangoTexto(opcion);
  if (rango) partes.push(rango);
  return partes.filter(Boolean).join(" ");
}

/** Mensaje de rango fuera de lo permitido, o `null` si el valor es válido. */
export function errorDeRango(opcion: OpcionConfig, valor: number): string | null {
  if (opcion.minimo == null || opcion.maximo == null) return null;
  if (!Number.isFinite(valor) || valor < opcion.minimo || valor > opcion.maximo) {
    return `«${opcion.etiqueta}» debe estar entre ${opcion.minimo} y ${opcion.maximo}.`;
  }
  return null;
}

function cumple(condicion: "no_vacia" | "verdadera" | "igual", esperado: string | null | undefined, valor: unknown): boolean {
  if (condicion === "verdadera") return valor === true;
  if (condicion === "igual") return String(valor) === esperado;
  if (Array.isArray(valor)) return valor.length > 0;
  return typeof valor === "string" ? valor.trim() !== "" : valor != null;
}

/** ¿La opción tiene efecto con los valores actuales? Si no, trae el motivo para mostrarlo. */
export function dependencia(
  opcion: OpcionConfig,
  valores: Record<string, unknown>,
): { activa: boolean; motivo: string; de: string } {
  const dep = opcion.depende_de;
  if (!dep) return { activa: true, motivo: "", de: "" };
  const activa = cumple(dep.condicion, dep.valor, valores[dep.clave]);
  return { activa, motivo: activa ? "" : dep.motivo, de: dep.clave };
}

/** Secciones de la pantalla de Identidad, en el orden en que se muestran. */
export const GRUPOS_IDENTIDAD: { id: OpcionConfig["grupo"]; titulo: string; descripcion: string }[] = [
  { id: "identidad", titulo: "El negocio", descripcion: "Cómo se presenta el asistente y dónde está tu negocio." },
  { id: "voz", titulo: "Cómo habla", descripcion: "La personalidad con la que responde a tus clientes." },
  { id: "respuesta", titulo: "Cómo responde", descripcion: "El ritmo y la forma de enviar sus respuestas." },
  { id: "calidad", titulo: "Calidad de las respuestas", descripcion: "Cuándo el asistente piensa más y qué validaciones aplica." },
  { id: "escalamiento", titulo: "Pasar con una persona", descripcion: "Cuándo el asistente cede la conversación." },
  { id: "horario", titulo: "Horario de atención", descripcion: "Cuándo atiende el asistente y qué dice fuera de horario." },
];

/** Opciones del grupo que esta pantalla pinta con un control genérico (las demás tienen pantalla propia). */
const SIN_CONTROL_GENERICO = new Set(["palabras_de_baja", "business_tz"]);

export function opcionesDelGrupo(
  catalogo: CatalogoConfig,
  grupo: OpcionConfig["grupo"],
  valores: Record<string, unknown>,
): OpcionConfig[] {
  return catalogo.opciones.filter(
    (o) => o.grupo === grupo && !SIN_CONTROL_GENERICO.has(o.clave) && o.clave in valores,
  );
}

/** Errores de rango de los campos numéricos; `{clave: mensaje}`, vacío si todo está bien. */
export function erroresDeRango(catalogo: CatalogoConfig, valores: Record<string, unknown>): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const opcion of catalogo.opciones) {
    if (opcion.tipo !== "entero" || !(opcion.clave in valores)) continue;
    const error = errorDeRango(opcion, Number(valores[opcion.clave]));
    if (error) errores[opcion.clave] = error;
  }
  return errores;
}
