import type { CargoSuscripcion } from "@/lib/api/types";
import { diaEnPalabras } from "@/lib/plataforma";
import { comoPago, textoDeMora } from "@/lib/suscripciones-admin";

/** Cuándo vence o cómo se pagó un cobro, en palabras (SUS-08, SUS-12). */
export function DetalleDelCobro({ cargo: c }: { cargo: Pick<CargoSuscripcion, "estado" | "pago_externo" | "fecha_vencimiento" | "dias_mora"> }) {
  if (c.estado === "pagado") return <span className="text-body">{comoPago(c.pago_externo) ?? "Pagado"}</span>;
  if (c.estado === "anulado") return <span className="text-text-soft">Anulado</span>;
  const vence = c.fecha_vencimiento ? diaEnPalabras(c.fecha_vencimiento) : null;
  if (c.dias_mora != null && c.dias_mora > 0) {
    return <span className="text-status-danger-fg">{`Venció el ${vence ?? "—"} · ${textoDeMora(c.dias_mora)}`}</span>;
  }
  return <span className="text-body">{vence ? `Vence el ${vence}` : "Sin fecha"}</span>;
}
