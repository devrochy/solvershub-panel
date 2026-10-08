/** Reglas de la agenda en el panel (HU-SH-02). */

/** Una cita pasada (ya terminó) y programada o ya marcada: se puede marcar la asistencia. */
export function puedeMarcarAsistencia(
  cita: { kind: string; status: string; end: string },
  ahora: Date = new Date(),
): boolean {
  return (
    cita.kind === "appointment" &&
    ["scheduled", "asistio", "no_asistio"].includes(cita.status) &&
    new Date(cita.end).getTime() <= ahora.getTime()
  );
}

/** Mensaje tras marcar la asistencia. */
export function mensajeAsistencia(asistio: boolean): string {
  return asistio
    ? "Marcada como asistida."
    : "Marcada como no asistida. Le ofrecimos al cliente reagendar por WhatsApp.";
}

/** Enlace de reunión válido (vacío o https://). */
export function enlaceValido(valor: string): boolean {
  const v = valor.trim();
  return v === "" || v.startsWith("https://") || v.startsWith("http://");
}
