/** Resultado de volver del OAuth de Google (`?google=`), compartido por Agenda y la ficha de la conexión. */
const AVISOS: Record<string, { tone: string; texto: string }> = {
  ok: { tone: "text-status-success-fg", texto: "Google Calendar conectado." },
  cancelado: { tone: "text-status-warning-fg", texto: "Cancelaste la autorización de Google." },
  error: { tone: "text-status-danger-fg", texto: "No se pudo completar la conexión con Google." },
  otro_negocio: {
    tone: "text-status-danger-fg",
    texto:
      "No se conectó: cambiaste de negocio mientras autorizabas en Google. Vuelve a conectar desde el negocio correcto.",
  },
  otra_cuenta: {
    tone: "text-status-danger-fg",
    texto:
      "Autorizaste una cuenta de Google distinta a la de esta conexión. Para otra cuenta usa «Conectar otra cuenta».",
  },
  not_configured: {
    tone: "text-status-warning-fg",
    texto: "Configura las credenciales de Google del pack antes de conectar.",
  },
};

export function avisoDeGoogle(codigo: string | undefined) {
  return codigo ? AVISOS[codigo] : undefined;
}

export function AvisoGoogle({ codigo }: { codigo: string | undefined }) {
  const aviso = avisoDeGoogle(codigo);
  if (!aviso) return null;
  return (
    <p role="status" className={aviso.tone}>
      {aviso.texto}
    </p>
  );
}
