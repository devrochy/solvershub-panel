/**
 * Mensajes de validación en español (HU-UX-13). Un solo lugar para el texto, para que lo escriba igual
 * el formulario generado desde JSON Schema (`errorDeCampo`) y el gestor de la validación nativa del
 * navegador (`mensajeDeValidacion`), cuya burbuja sale en el idioma del navegador (en inglés en un Chrome en-US).
 */

export const mensajeObligatorio = (etiqueta: string) => `${etiqueta} es obligatorio.`;

/** Rango numérico: «debe estar entre A y B» si hay los dos límites, o «mayor/menor o igual a». `null` si cumple. */
export function mensajeDeRango(etiqueta: string, n: number, minimo?: number | null, maximo?: number | null): string | null {
  const hayMin = minimo != null && Number.isFinite(minimo);
  const hayMax = maximo != null && Number.isFinite(maximo);
  if (hayMin && hayMax && (n < minimo! || n > maximo!)) return `${etiqueta} debe estar entre ${minimo} y ${maximo}.`;
  if (hayMin && n < minimo!) return `${etiqueta} debe ser mayor o igual a ${minimo}.`;
  if (hayMax && n > maximo!) return `${etiqueta} debe ser menor o igual a ${maximo}.`;
  return null;
}

export const mensajeEntero = (etiqueta: string) => `${etiqueta} debe ser un número entero.`;
export const mensajeNumero = (etiqueta: string) => `${etiqueta} debe ser un número.`;
export const CORREO_INVALIDO = "Escribe un correo válido, por ejemplo ana@correo.com.";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function humanizar(nombre: string): string {
  const texto = nombre.replace(/[_-]+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "Este campo";
}

/** Nombre del campo entre «», tomado de su `<label>` (sin el « *(obligatorio)» que agrega `Field`). */
export function etiquetaDeControl(el: Control): string {
  const deLabel = el.labels?.[0]?.textContent ?? "";
  const limpia = deLabel
    .replace(/\s*\*?\s*\(obligatorio\)\s*$/i, "")
    .replace(/\s*\*\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const texto = limpia && limpia.length <= 80 ? limpia : (el.getAttribute("aria-label") ?? humanizar(el.name || el.id));
  return `«${texto}»`;
}

/** Mensaje en español de por qué el control no cumple su validación nativa (`required`, `min`, `type=email`…). */
export function mensajeDeValidacion(el: Control): string {
  const etiqueta = etiquetaDeControl(el);
  const v = el.validity;
  const tipo = el instanceof HTMLInputElement ? el.type : el instanceof HTMLSelectElement ? "select" : "textarea";
  const numerico = tipo === "number" || tipo === "range";

  if (v.customError) return el.validationMessage;
  if (v.valueMissing) {
    if (tipo === "checkbox") return `Marca ${etiqueta} para continuar.`;
    if (tipo === "radio") return "Elige una opción.";
    if (tipo === "select" || tipo === "select-one") return `Elige una opción en ${etiqueta}.`;
    if (tipo === "file") return `Elige un archivo en ${etiqueta}.`;
    return mensajeObligatorio(etiqueta);
  }
  if (v.typeMismatch) {
    if (tipo === "email") return CORREO_INVALIDO;
    if (tipo === "url") return `${etiqueta} debe ser una dirección web completa, por ejemplo https://ejemplo.com.`;
    return `${etiqueta} no es válido.`;
  }
  if (v.badInput) return numerico ? mensajeNumero(etiqueta) : `${etiqueta} no es válido.`;
  if (v.rangeUnderflow || v.rangeOverflow) {
    const el_ = el as HTMLInputElement;
    if (numerico) {
      const msg = mensajeDeRango(etiqueta, Number(el_.value), el_.min === "" ? null : Number(el_.min), el_.max === "" ? null : Number(el_.max));
      if (msg) return msg;
    }
    return v.rangeUnderflow
      ? `${etiqueta} no puede ser anterior a ${el_.min}.`
      : `${etiqueta} no puede ser posterior a ${el_.max}.`;
  }
  if (v.stepMismatch) {
    const paso = (el as HTMLInputElement).step;
    return numerico && (paso === "" || paso === "1") ? mensajeEntero(etiqueta) : `${etiqueta} no es un valor válido.`;
  }
  if (v.tooShort) return `${etiqueta} debe tener al menos ${(el as HTMLInputElement).minLength} caracteres.`;
  if (v.tooLong) return `${etiqueta} admite como máximo ${(el as HTMLInputElement).maxLength} caracteres.`;
  if (v.patternMismatch) return el.title || `${etiqueta} no tiene el formato esperado.`;
  return `${etiqueta} no es válido.`;
}
