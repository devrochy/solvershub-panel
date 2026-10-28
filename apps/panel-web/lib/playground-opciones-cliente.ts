/**
 * Cliente del BFF para probar plantillas con opciones en el playground (`/api/playground/options` y `/tap`,
 * SPEC-40, pista B2). Devuelve `{ok, status, data}` o el error ya normalizado, como `opcionesApi`.
 */
import type { PlaygroundOpcionesResultado, PlaygroundToque } from "@/lib/api/types";
import { pedir } from "@/lib/plantillas-opciones-cliente";

const con = (cuerpo: Record<string, unknown>, conexionId?: string) => ({ ...cuerpo, ...(conexionId ? { connection_id: conexionId } : {}) });

export const playgroundOpcionesApi = {
  /** Envía la versión publicada de la plantilla a la conversación de prueba. */
  enviar: (clave: string, conexionId?: string) => pedir<PlaygroundOpcionesResultado>("POST", "/api/playground/options", con({ clave }, conexionId)),
  /** Simula el toque de un botón. **Ejecuta la tool de verdad** contra los datos del negocio. */
  tocar: (payload: string, conexionId?: string) => pedir<PlaygroundToque>("POST", "/api/playground/tap", con({ payload }, conexionId)),
};
