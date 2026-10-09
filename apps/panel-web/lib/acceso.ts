/**
 * Acceso sin sesión (HU-SH-06): definir la contraseña desde el enlace de la invitación
 * (ADR-0121) y recuperarla con el código por correo (ADR-0098). Lógica pura: validación y
 * mensajes en lenguaje claro. Las páginas solo la usan.
 */

/** Largo máximo del token que acepta la API (`AcceptInvitationRequest.token`). */
const MAX_TOKEN = 200;
const FORMA_DEL_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]{16,}$/i;

/**
 * Token del enlace `/invitacion#<token>`. Va en el fragmento para que no llegue a los logs del
 * proxy (ADR-0121): la página lo lee del navegador. Devuelve null si falta o no tiene la forma.
 */
export function tokenDelFragmento(hash: string | null | undefined): string | null {
  let crudo = (hash ?? "").replace(/^#/, "").trim();
  if (!crudo || crudo.length > MAX_TOKEN * 3) return null;
  try {
    crudo = decodeURIComponent(crudo);
  } catch {
    return null;
  }
  if (crudo.length > MAX_TOKEN || !FORMA_DEL_TOKEN.test(crudo)) return null;
  return crudo;
}

/** Donde el script de la página deja el fragmento crudo antes de borrarlo de la URL. */
export const VARIABLE_DEL_TOKEN = "__shInvitacionToken";

/**
 * Script en línea de `/invitacion`: corre al parsear el HTML, antes de hidratar React. Guarda el
 * fragmento en `window` y lo borra de la barra de direcciones y del historial (`replaceState`),
 * así el `#token` no queda a la vista ni en la entrada del historial.
 */
export const SCRIPT_QUE_GUARDA_EL_TOKEN = `(function(){try{var h=window.location.hash;if(h&&h.length>1){window.${VARIABLE_DEL_TOKEN}=h;window.history.replaceState(null,"",window.location.pathname+window.location.search);}}catch(e){}})();`;

export const LARGO_MINIMO_CONTRASENA = 8;

/** Error de la contraseña nueva (mínimo 8 y confirmada), o null si sirve. */
export function errorDeContrasenaNueva(clave: string, confirmacion: string): string | null {
  if (clave.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  if (clave !== confirmacion) return "Las dos contraseñas no coinciden.";
  return null;
}

export type ResultadoDelCanje = "enlace_invalido" | "cuenta_existente" | "bloqueado" | "error";

/** Qué pasó con el canje, por el código HTTP de la API. */
export function resultadoDelCanje(status: number): ResultadoDelCanje {
  if (status === 400) return "enlace_invalido";
  if (status === 409) return "cuenta_existente";
  if (status === 429) return "bloqueado";
  return "error";
}

export const MENSAJE_DEL_CANJE: Record<ResultadoDelCanje, string> = {
  enlace_invalido:
    "El enlace no es válido o ya se usó. Si ya definiste tu contraseña, inicia sesión; si no, pide un enlace nuevo a quien te dio de alta.",
  cuenta_existente:
    "Ya tienes una cuenta con este correo. Inicia sesión con tu contraseña (o recupérala) y acepta la invitación en el panel.",
  bloqueado: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  error: "No se pudo guardar tu contraseña. Inténtalo de nuevo en unos minutos.",
};

// Alfabeto del código de recuperación (ADR-0098): sin 0/O ni 1/I/L.
const CODIGO_DE_RECUPERACION = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

/** Normaliza lo que escribe la persona (mayúsculas, sin espacios ni guiones). */
export function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[\s-]+/g, "");
}

export function codigoValido(codigo: string): boolean {
  return CODIGO_DE_RECUPERACION.test(normalizarCodigo(codigo));
}

/** Mensaje de error al aplicar el código de recuperación. */
export function mensajeDelReset(status: number): string {
  if (status === 400) return "El código no es válido o ya venció. Pide uno nuevo.";
  if (status === 422) return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  if (status === 429) return MENSAJE_DEL_CANJE.bloqueado;
  return "No se pudo cambiar la contraseña. Inténtalo de nuevo en unos minutos.";
}
