/**
 * Cliente del BFF de plantillas con opciones (`/api/plantillas-opciones/**`), para el editor (HU-OPC-06).
 * Cada llamada devuelve `{ok, status, data}` o el error ya normalizado (`leerError`): el mensaje, el
 * `code` estable y los hallazgos de un 422/409. Una petición cancelada (`AbortController`) lanza
 * `AbortError`; quien la cancela la ignora.
 */
import type {
  OpcionesAccionDelCatalogo,
  OpcionesDefinicion,
  OpcionesPlantilla,
  OpcionesPlantillaResumen,
  OpcionesPrueba,
  OpcionesPublicada,
  OpcionesValidacion,
  OpcionesVariable,
  OpcionesVistaPrevia,
} from "@/lib/api/types";
import { leerError, type ErrorDeApi } from "@/lib/plantillas-opciones";

export type Resultado<T> = { ok: true; status: number; data: T } | ({ ok: false } & ErrorDeApi);

const BASE = "/api/plantillas-opciones";

async function llamar<T>(metodo: "GET" | "POST" | "PUT" | "DELETE", ruta: string, cuerpo?: unknown, senal?: AbortSignal): Promise<Resultado<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      signal: senal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, status: 0, mensaje: "No se pudo contactar el servidor.", hallazgos: [] };
  }
  const json = res.status === 204 ? null : ((await res.json().catch(() => null)) as unknown);
  if (!res.ok) return { ok: false, ...leerError(res.status, json) };
  return { ok: true, status: res.status, data: json as T };
}

const clave = (c: string) => encodeURIComponent(c);

export const opcionesApi = {
  listar: () => llamar<{ plantillas: OpcionesPlantillaResumen[] }>("GET", ""),
  crear: (cuerpo: { clave: string; nombre: string; definicion?: OpcionesDefinicion }) => llamar<OpcionesPlantilla>("POST", "", cuerpo),
  obtener: (c: string) => llamar<OpcionesPlantilla>("GET", `/${clave(c)}`),
  guardarBorrador: (c: string, cuerpo: { nombre: string; definicion: OpcionesDefinicion }) =>
    llamar<OpcionesPlantilla>("PUT", `/${clave(c)}/borrador`, cuerpo),
  eliminar: (c: string) => llamar<null>("DELETE", `/${clave(c)}`),
  publicar: (c: string) => llamar<OpcionesPublicada>("POST", `/${clave(c)}/publicar`, {}),
  retirar: (c: string) => llamar<OpcionesPlantilla>("POST", `/${clave(c)}/retirar`, {}),
  enviarPrueba: (c: string, cuerpo: { conversation_id: string; clave_idempotencia: string }) =>
    llamar<OpcionesPrueba>("POST", `/${clave(c)}/enviar-prueba`, cuerpo),
  validar: (definicion: OpcionesDefinicion, senal?: AbortSignal) => llamar<OpcionesValidacion>("POST", "/validar", { definicion }, senal),
  vistaPrevia: (definicion: OpcionesDefinicion, senal?: AbortSignal) =>
    llamar<OpcionesVistaPrevia>("POST", "/vista-previa", { definicion }, senal),
  catalogoAcciones: () => llamar<{ acciones: OpcionesAccionDelCatalogo[] }>("GET", "/catalogo-acciones"),
  catalogoVariables: () => llamar<{ variables: OpcionesVariable[] }>("GET", "/catalogo-variables"),
};
