import type { components } from "@/lib/api/schema";

/**
 * Comprobantes de transferencia del pedido (SPEC-48, HU-COM-22): lo que leyó la visión y por qué el
 * servidor lo dejó pagado, en revisión o rechazado, en palabras. Nada crudo a la vista.
 */

export type Comprobantes = components["schemas"]["ComprobantesOut"];
export type Comprobante = components["schemas"]["ComprobanteOut"];

export const RESULTADO: Record<Comprobante["status"], { label: string; tono: "success" | "info" | "danger" }> = {
  pagado: { label: "Coincide: pago confirmado", tono: "success" },
  en_revision: { label: "En revisión", tono: "info" },
  rechazado: { label: "No coincide", tono: "danger" },
};

const MOTIVOS: Record<string, string> = {
  monto_ilegible: "No se lee el monto",
  monto_menor: "El monto es menor que el total",
  monto_mayor: "El monto es mayor que el total",
  transferencia_fallida: "El comprobante dice que la transferencia falló",
  estado_no_exitoso: "No dice que la transferencia se hizo",
  cuenta_no_coincide: "La cuenta no es una de las tuyas",
  sin_cuenta: "No se ve la cuenta que recibe",
  fecha_anterior: "La fecha es anterior al pedido",
  sin_fecha: "No se ve la fecha",
  duplicado: "Este comprobante ya se usó en otro pedido",
  lectura_dudosa: "La foto no se lee bien",
  ilegible: "No se pudo leer la foto",
  lectura_apagada: "La lectura automática está apagada",
};

export function motivosEnPalabras(match: Record<string, unknown>): string[] {
  const motivos = Array.isArray(match.motivos) ? match.motivos : [];
  return motivos.filter((m): m is string => typeof m === "string").map((m) => MOTIVOS[m] ?? "Otro motivo");
}

export type DatoLeido = { label: string; valor: string };

/** Lo que leyó la visión, con la cuenta solo en sus últimos 4 dígitos (así viene del servidor). */
export function datosLeidos(extraido: Record<string, unknown>, formatoMonto: (n: number) => string): DatoLeido[] {
  const datos: DatoLeido[] = [];
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (typeof extraido.monto === "number") datos.push({ label: "Monto", valor: formatoMonto(extraido.monto) });
  const fecha = texto(extraido.fecha);
  if (fecha) datos.push({ label: "Fecha", valor: fecha.replace("T", " ") });
  const estado = texto(extraido.estado);
  if (estado) datos.push({ label: "Estado", valor: { exitoso: "Exitosa", pendiente: "En proceso", rechazado: "Fallida" }[estado] ?? "Sin dato" });
  const banco = texto(extraido.banco);
  if (banco) datos.push({ label: "Entidad", valor: banco });
  const cuenta = texto(extraido.cuenta_destino);
  if (cuenta) datos.push({ label: "Cuenta", valor: `terminada en ${cuenta.slice(-4)}` });
  const ref = texto(extraido.referencia);
  if (ref) datos.push({ label: "Referencia", valor: ref });
  return datos;
}
