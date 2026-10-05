/**
 * Resultado real del aviso al cliente cuando el negocio mueve o cancela una cita
 * (HU-CAL-05). El backend lo devuelve en `notification`; `null` = no se avisó.
 */
export type ClientNotification = {
  email_sent: boolean;
  email_reason: string;
  whatsapp_sent: boolean;
} | null;

const EMAIL_REASONS: Record<string, string> = {
  no_connection: "no hay una conexión de correo activa",
  sin_destinatarios: "la cita no tiene email del cliente",
  invalid_recipient: "el email del cliente no es válido",
  sin_configuracion: "la habilidad de Agenda no está configurada",
};

function emailReason(reason: string): string {
  return EMAIL_REASONS[reason] ?? "falló el envío";
}

/** Texto para el negocio con lo que de verdad le llegó al cliente. */
export function describeNotification(done: string, notification: ClientNotification | undefined): string {
  if (!notification) return done;
  const { email_sent: email, whatsapp_sent: whatsapp } = notification;
  if (email && whatsapp) return `${done} Avisamos al cliente por correo y WhatsApp.`;
  if (email) {
    return `${done} Avisamos al cliente por correo; el WhatsApp no salió (la conversación está pausada, cerrada o no existe).`;
  }
  if (whatsapp) {
    return `${done} Avisamos al cliente por WhatsApp; el correo no salió porque ${emailReason(notification.email_reason)}.`;
  }
  return `${done} No pudimos avisar al cliente: el correo no salió porque ${emailReason(notification.email_reason)} y el WhatsApp tampoco.`;
}
