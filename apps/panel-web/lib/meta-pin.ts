/**
 * PIN de verificación en dos pasos de un número de WhatsApp (registro en la Cloud API).
 * Vacío = que el backend use el PIN guardado o genere uno; si no, exactamente 6 dígitos (0-9).
 */
export function parsePin(raw: string): { pin: string | null } | { error: string } {
  const value = raw.trim();
  if (value === "") return { pin: null };
  if (!/^[0-9]{6}$/.test(value)) return { error: "El PIN tiene que ser de 6 dígitos." };
  return { pin: value };
}
