import type { LeadCampoPerfil } from "@/lib/api/types";

/** Campos que no se pintan como texto en el formulario. */
export const CAMPOS_OCULTOS = new Set(["avatar_url", "pais_telefono", "latitud", "longitud"]);

/** La foto y el país del teléfono se manejan con controles propios. */
const SIN_VALIDAR = new Set(["avatar_url", "pais_telefono"]);

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_HTTP = /^https?:\/\//i;

export const PLACEHOLDERS: Record<string, string> = {
  name: "Ej. Ana María",
  apellido: "Ej. Gómez",
  alias: "Ej. Anita",
  phone: "300 123 4567",
  email: "ana@correo.com",
  tipo_documento: "Elige un tipo",
  id_document: "Ej. 1020304050",
  address: "Ej. Calle 45 # 12-30, Apto 201",
  municipio: "Ej. Medellín",
  departamento: "Ej. Antioquia",
  pais: "Ej. Colombia",
  latitud: "Ej. 6.2442",
  longitud: "Ej. -75.5812",
  clasificacion: "Elige una clasificación",
};

export function placeholderDe(campo: LeadCampoPerfil): string | undefined {
  return PLACEHOLDERS[campo.key];
}

export function campoVisible(campo: LeadCampoPerfil): boolean {
  return !CAMPOS_OCULTOS.has(campo.key);
}

function digitos(valor: string): number {
  return valor.replace(/\D+/g, "").length;
}

function numero(valor: string): number | null {
  if (!valor.trim()) return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function validarCampoPerfil(
  campo: LeadCampoPerfil,
  valor: string,
  valores: Record<string, string>,
): string | null {
  const texto = valor.trim();
  if (campo.required && !texto) {
    return campo.key === "name" ? "El nombre no puede quedar vacío." : "Este campo es obligatorio.";
  }
  if (texto.length > campo.max_length) return `Máximo ${campo.max_length} caracteres.`;
  if (campo.tipo === "email" && texto && !CORREO.test(texto)) {
    return "Escribe un correo válido, por ejemplo ana@correo.com.";
  }
  if (campo.tipo === "telefono" && texto && (digitos(texto) < 7 || digitos(texto) > 15)) {
    return "Escribe un teléfono válido (7 a 15 dígitos).";
  }
  if (campo.tipo === "url" && texto && !URL_HTTP.test(texto)) {
    return "La foto debe ser un enlace http(s).";
  }
  if (campo.tipo === "opciones" && texto && campo.options.length > 0) {
    if (!campo.options.some((opcion) => opcion.value === texto)) return "Elige una opción de la lista.";
  }
  if (campo.tipo === "numero" && texto && numero(texto) === null) return "Escribe un número válido.";
  if (campo.key === "latitud" || campo.key === "longitud") {
    const latitud = valores.latitud?.trim() ?? "";
    const longitud = valores.longitud?.trim() ?? "";
    if (Boolean(latitud) !== Boolean(longitud)) return "Latitud y longitud van juntas.";
    const n = numero(texto);
    if (texto && n !== null) {
      const limite = campo.key === "latitud" ? 90 : 180;
      if (n < -limite || n > limite) return `Debe estar entre -${limite} y ${limite}.`;
    }
  }
  return null;
}

export function validarPerfilCliente(
  campos: LeadCampoPerfil[],
  valores: Record<string, string>,
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of campos) {
    if (SIN_VALIDAR.has(campo.key)) continue;
    const error = validarCampoPerfil(campo, valores[campo.key] ?? "", valores);
    if (error) errores[campo.key] = error;
  }
  return errores;
}
