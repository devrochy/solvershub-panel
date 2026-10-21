/**
 * Envío de una plantilla a un segmento de Clientes (HU-CRM-06, ADR-0150): textos y armado de las
 * variables del diálogo. La lógica (consentimiento, topes, instantánea) vive en el backend.
 */

export type Fuente = "fijo" | "cliente.nombre";
export type Variable = { fuente: Fuente; valor: string };

/** Variables vacías para los placeholders de la plantilla; la primera, con el nombre del cliente. */
export function variablesIniciales(placeholders: string[]): Record<string, Variable> {
  return Object.fromEntries(
    placeholders.map((p, i) => [p, { fuente: i === 0 ? "cliente.nombre" : "fijo", valor: "" } satisfies Variable]),
  );
}

/** Mensaje de la variable que falta llenar, o null si están todas. */
export function faltaVariable(variables: Record<string, Variable>): string | null {
  for (const [p, v] of Object.entries(variables)) {
    if (v.fuente === "fijo" && !v.valor.trim()) return `Completa la variable {{${p}}}.`;
  }
  return null;
}

/** Texto de la plantilla con los valores fijos puestos y el nombre como «[nombre]». */
export function textoDeEjemplo(body: string, variables: Record<string, Variable>): string {
  return body.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (todo, p: string) => {
    const v = variables[p];
    if (!v) return todo;
    return v.fuente === "cliente.nombre" ? "[nombre del cliente]" : v.valor.trim() || todo;
  });
}

export const BLOQUEO: Record<string, string> = {
  sin_destinatarios: "Nadie del filtro puede recibirla: revisa los motivos de abajo.",
  tope: "Son más que el tope por envío. Acota el filtro (por ejemplo, por conexión o clasificación).",
  envio_en_curso: "Ya hay un envío en curso por esta conexión. Espera a que termine.",
};

const ESTADO_DEL_ENVIO: Record<string, string> = {
  pendiente: "Pendientes",
  queued: "En cola",
  sent: "Enviados",
  delivered: "Entregados",
  read: "Leídos",
  failed: "Fallidos",
  omitido: "Omitidos",
};

/** Conteo del envío en el orden del recorrido, con etiquetas. */
export function conteoDelEnvio(conteo: Record<string, number>): { label: string; total: number }[] {
  const orden = Object.keys(ESTADO_DEL_ENVIO);
  return Object.entries(conteo)
    .sort(([a], [b]) => (orden.indexOf(a) + 99 * Number(!orden.includes(a))) - (orden.indexOf(b) + 99 * Number(!orden.includes(b))))
    .map(([estado, total]) => ({ label: ESTADO_DEL_ENVIO[estado] ?? estado, total }));
}

export const ESTADO_GENERAL: Record<string, string> = {
  borrador: "Sin confirmar",
  confirmado: "Confirmado",
  enviando: "Enviando",
  terminado: "Terminado",
};
