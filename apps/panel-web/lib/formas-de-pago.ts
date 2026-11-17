import type { components } from "@/lib/api/schema";

/**
 * Formas de pago del agente de Ventas (SPEC-48, HU-COM-21): contra entrega, transferencia y pago en
 * línea. El servidor decide el estado al guardar; aquí se recalcula mientras el dueño edita para que
 * «Falta configurar» aparezca o desaparezca al instante, con las mismas reglas.
 */

export type FormasDePago = components["schemas"]["FormasDePagoOut"];
export type FormaDePago = components["schemas"]["FormaDePagoOut"];
export type CuentaDeTransferencia = components["schemas"]["CuentaDeTransferencia"];
export type Metodo = FormaDePago["method"];
export type EstadoDeForma = FormaDePago["estado"];

export const ETIQUETA_DE_ESTADO: Record<EstadoDeForma, string> = {
  activa: "Activa",
  falta_configurar: "Falta configurar",
  apagada: "Apagada",
};

export const TONO_DE_ESTADO: Record<EstadoDeForma, "success" | "warning" | "neutral"> = {
  activa: "success",
  falta_configurar: "warning",
  apagada: "neutral",
};

export const DESCRIPCION: Record<Metodo, string> = {
  efectivo_contraentrega: "El cliente paga al recibir. No necesita comprobación.",
  transferencia: "El agente envía tus cuentas y pide el comprobante.",
  pago_en_linea: "El agente envía un link de pago y confirma cuando se paga.",
};

export type Borrador = {
  forms: { method: Metodo; enabled: boolean; instructions: string }[];
  transfer_accounts: CuentaDeTransferencia[];
  transfer_proof_required: boolean;
  transfer_ocr_enabled: boolean;
};

export function borradorDesde(datos: FormasDePago): Borrador {
  return {
    forms: datos.forms.map((f) => ({ method: f.method, enabled: f.enabled, instructions: f.instructions })),
    transfer_accounts: datos.transfer_accounts.map((c) => ({ ...c })),
    transfer_proof_required: datos.transfer_proof_required,
    transfer_ocr_enabled: datos.transfer_ocr_enabled,
  };
}

export function cuentaVacia(): CuentaDeTransferencia {
  return { entity: "", accountType: "", accountNumber: "", holderName: "", holderDocument: "" };
}

function cuentaCompleta(c: CuentaDeTransferencia): boolean {
  return Boolean(c.entity.trim() && c.accountNumber.trim());
}

/** Estado de una forma con lo que hay en pantalla (mismas reglas que `formas_de_pago.py`). */
export function estadoEnPantalla(
  metodo: Metodo,
  encendida: boolean,
  cuentas: CuentaDeTransferencia[],
  pagoEnLineaDisponible: boolean,
): { estado: EstadoDeForma; falta: string } {
  let falta = "";
  if (metodo === "transferencia" && !cuentas.some(cuentaCompleta)) {
    falta = "Agrega al menos una cuenta para recibir transferencias.";
  } else if (metodo === "pago_en_linea" && !pagoEnLineaDisponible) {
    falta = "Conecta una cuenta de pagos en línea (Wompi) para enviar links de pago.";
  }
  if (!encendida) return { estado: "apagada", falta };
  return { estado: falta ? "falta_configurar" : "activa", falta };
}

/** Qué impide guardar, o `null`. Una cuenta a medias se marca; transferencia sin cuenta sí se guarda. */
export function problemaAlGuardar(b: Borrador): string | null {
  if (!b.forms.some((f) => f.enabled)) return "Deja al menos una forma de pago encendida.";
  const incompleta = b.transfer_accounts.findIndex((c) => !cuentaCompleta(c));
  if (incompleta >= 0) return `La cuenta ${incompleta + 1} necesita la entidad y el número.`;
  if (b.transfer_ocr_enabled && !b.transfer_proof_required) return "Leer el comprobante exige pedirlo.";
  return null;
}

export function mismoBorrador(a: Borrador, b: Borrador): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
