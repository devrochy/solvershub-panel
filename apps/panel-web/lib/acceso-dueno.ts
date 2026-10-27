/**
 * Acceso del dueño al crear un negocio (agent-core ADR-0174). La API no devuelve el enlace:
 * solo dice qué pasó con el correo. Esta función lo traduce a un mensaje para quien opera,
 * con el siguiente paso cuando el correo no salió.
 */
import type { TenantOwnerInvitation } from "@/lib/api/types";

export type MensajeAcceso = {
  /** `ok`: salió o no hay nada que hacer; `aviso`: el negocio existe pero falta entregar el acceso. */
  tono: "ok" | "aviso";
  texto: string;
};

const SIGUIENTE_PASO = "Usa «Reenviar acceso» en las «Acciones» del negocio.";

function vence(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "";
  const fecha = new Date(expiresAt);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/** Mensaje al crear el negocio (o al reenviar el acceso). */
export function mensajeAcceso(invitation: TenantOwnerInvitation, { reenvio = false } = {}): MensajeAcceso {
  const creado = reenvio ? "" : "Negocio creado. ";
  const fecha = vence(invitation.expires_at);
  switch (invitation.estado) {
    case "enviado":
      return {
        tono: "ok",
        texto:
          invitation.tipo === "enlace"
            ? `${creado}Enviamos al dueño un enlace para definir su contraseña${fecha ? ` (vence el ${fecha})` : ""}.`
            : `${creado}Enviamos al dueño un correo para que acepte la invitación al negocio en la app.`,
      };
    case "sin_smtp":
      return {
        tono: "aviso",
        texto: `${creado}El correo no se envió: el servidor no tiene el correo del sistema configurado. ${
          reenvio ? "Configúralo y vuelve a intentarlo." : "Configúralo y luego usa «Reenviar acceso» en las «Acciones» del negocio."
        }`,
      };
    case "fallido":
      return {
        tono: "aviso",
        texto: `${creado}El correo no salió (el servidor de correo no respondió). ${
          reenvio ? "Inténtalo de nuevo en unos minutos." : SIGUIENTE_PASO
        }`,
      };
    case "ya_emitida":
      return {
        tono: "ok",
        texto: `${creado}Ya se había enviado el acceso al dueño. Si no le llegó, usa «Reenviar acceso».`,
      };
    case "ya_es_miembro":
      return { tono: "ok", texto: `${creado}Esa cuenta ya es parte del negocio: entra con su contraseña.` };
  }
}
