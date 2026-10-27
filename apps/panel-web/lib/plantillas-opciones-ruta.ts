/**
 * Rutas del BFF de plantillas con opciones (`/api/plantillas-opciones/**`) → ruta del backend
 * (`/api/v1/plantillas-opciones/**`). Lista cerrada: solo se reenvía lo que el panel usa, con el método
 * que corresponde y una clave que cumple el formato del backend; nada más llega a agent-core.
 */
const BASE = "/plantillas-opciones";
const CLAVE = /^[a-z0-9_]{1,40}$/;

const GET_SUELTAS = new Set(["catalogo-acciones", "catalogo-variables"]);
const POST_SUELTAS = new Set(["validar", "vista-previa"]);
const POST_DE_CLAVE = new Set(["publicar", "retirar", "enviar-prueba"]);

export function rutaDeBackend(metodo: string, segmentos: readonly string[]): string | null {
  const m = metodo.toUpperCase();
  if (segmentos.length === 0) return m === "GET" || m === "POST" ? BASE : null;
  const [primero, segundo] = segmentos;
  if (segmentos.length === 1) {
    if (m === "GET" && GET_SUELTAS.has(primero)) return `${BASE}/${primero}`;
    if (m === "POST" && POST_SUELTAS.has(primero)) return `${BASE}/${primero}`;
    if ((m === "GET" || m === "DELETE") && CLAVE.test(primero)) return `${BASE}/${primero}`;
    return null;
  }
  if (segmentos.length === 2 && CLAVE.test(primero)) {
    if (m === "PUT" && segundo === "borrador") return `${BASE}/${primero}/borrador`;
    if (m === "POST" && POST_DE_CLAVE.has(segundo)) return `${BASE}/${primero}/${segundo}`;
  }
  return null;
}
