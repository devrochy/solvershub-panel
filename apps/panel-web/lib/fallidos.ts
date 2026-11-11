/**
 * Mensajes fallidos (/dlq, CFG-08): lo técnico de la bandeja en palabras del negocio.
 */

const QUE: Record<string, string> = {
  payment: "Pago",
  order: "Pedido",
  subscription: "Suscripción",
  appointment: "Cita",
  invoice: "Factura",
};

const PASO: Record<string, string> = {
  approved: "aprobado",
  declined: "rechazado",
  failed: "fallido",
  created: "nuevo",
  paid: "pagado",
  cancelled: "cancelado",
  canceled: "cancelado",
  updated: "actualizado",
  paused: "pausada",
  renewed: "renovada",
  charge_created: "con cobro nuevo",
  confirmed: "confirmada",
};

/** «payment.approved» → «Pago aprobado»; un aviso desconocido se muestra tal cual. */
export function avisoEnPalabras(topic: string): string {
  const [que, paso] = topic.split(".", 2);
  if (!QUE[que]) return topic;
  return paso && PASO[paso] ? `${QUE[que]} ${PASO[paso]}` : QUE[que];
}

/** Hora en que llegó un mensaje: los ids de la bandeja empiezan por los milisegundos («1731200000000-0»). */
export function llegadaDe(entryId: string): Date | null {
  const ms = Number(entryId.split("-")[0]);
  return Number.isFinite(ms) && ms > 1_000_000_000_000 ? new Date(ms) : null;
}
