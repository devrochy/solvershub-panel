/**
 * Texto para el dueño de por qué un mensaje no salió (`messages.error_reason`). Solo los motivos que el dueño puede
 * entender o resolver; el resto queda como «No enviado.» (el código técnico se ve en el detalle del turno).
 */
const TEXTOS: Record<string, string> = {
  sin_plantilla: "No enviado: el cliente llevaba más de 24 h sin escribir y el aviso no tiene plantilla.",
  // HU-ARCH-37: con el asistente en pausa no sale nada automático; al reactivarlo no se reenvía.
  negocio_pausado: "No enviado: el asistente estaba en pausa. No se reenvía al reactivarlo.",
  cliente_pausado: "No enviado: el asistente estaba en pausa para este cliente. No se reenvía al reactivarlo.",
};

export function textoDeNoEnviado(motivo: string | null | undefined): string {
  return (motivo && TEXTOS[motivo]) || "No enviado.";
}
