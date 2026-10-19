"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { EscalationItem } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { ESCALACION, ESCALACION_RIESGO, escalacionCodigo, escalacionLabel } from "@/lib/labels";

type Motivo = Pick<EscalationItem, "reason"> & Partial<Pick<EscalationItem, "reason_code" | "reason_label">>;
type Tono = "neutral" | "info" | "warning" | "danger" | "accent";

/**
 * Color por motivo (HU-UX-17, como `HANDOFF_REASON_CHIP` de agent-sale): los de riesgo
 * (queja, monto alto) en advertencia, las fallas técnicas en peligro, lo que pidió el
 * cliente en informativo y las acciones de una habilidad en acento.
 */
const TONO: Record<string, Tono> = {
  solicitud_cliente: "info",
  palabra_clave: "info",
  accion_habilidad: "accent",
  falla_ia: "danger",
  rechazo_ia: "danger",
  envio_fallido: "danger",
  limite_iteraciones: "danger",
};

/** Código y etiqueta de un motivo: los de la API, o el respaldo de `lib/labels`. */
export function motivoDe(esc: Motivo): { codigo: string; etiqueta: string; tono: Tono } {
  const codigo = esc.reason_code ?? escalacionCodigo(esc.reason);
  const etiqueta = esc.reason_label || escalacionLabel(esc.reason);
  const tono = ESCALACION_RIESGO.has(codigo) ? "warning" : (TONO[codigo] ?? "neutral");
  return { codigo, etiqueta, tono };
}

export function MotivoBadge({ esc }: { esc: Motivo }) {
  const { etiqueta, tono } = motivoDe(esc);
  // Dos ramas iguales para que TS acote `variant`: con tono de estado el ícono es obligatorio.
  if (tono === "neutral" || tono === "accent") {
    return <Badge variant={tono} className="whitespace-nowrap">{etiqueta}</Badge>;
  }
  return <Badge variant={tono} className="whitespace-nowrap">{etiqueta}</Badge>;
}

type Fila = Motivo & Pick<EscalationItem, "summary" | "conversation_id" | "created_at"> & {
  customer_name?: string | null;
  external_id?: string | null;
};

/** Resumen de una escalación: una línea en la tabla y, al hacer clic, el texto completo. */
export function ResumenEscalacion({ esc }: { esc: Fila }) {
  if (!esc.summary) return <span className="text-body">—</span>;
  const cliente = esc.customer_name ?? esc.external_id ?? "Cliente";
  const { codigo } = motivoDe(esc);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Ver el resumen completo"
          className="block max-w-md truncate rounded-sm text-left text-body underline-offset-2 hover:text-headline hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {esc.summary}
        </button>
      </SheetTrigger>
      <SheetContent
        title={`Escalación de ${cliente}`}
        description={formatDateTime(esc.created_at)}
        footer={
          <Button asChild variant="outline" size="sm">
            <Link href={`/conversaciones/${esc.conversation_id}`}>Ver conversación</Link>
          </Button>
        }
      >
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-text-soft">Motivo</dt>
            <dd className="mt-1">
              <MotivoBadge esc={esc} />
            </dd>
          </div>
          {codigo === "otro" && esc.reason && (
            <div>
              <dt className="text-text-soft">Motivo registrado</dt>
              <dd className="mt-1 break-words text-body">{esc.reason}</dd>
            </div>
          )}
          <div>
            <dt className="text-text-soft">Resumen</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-headline">{esc.summary}</dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  );
}

/** Filtro por motivo (`?reason_code=`). Form GET, como el de conversaciones. */
export function EscalacionFilters({ motivo }: { motivo?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Motivo" htmlFor="reason_code" className="w-64">
        <Select id="reason_code" name="reason_code" defaultValue={motivo ?? ""}>
          <option value="">Todos los motivos</option>
          {Object.entries(ESCALACION).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {motivo && (
        <Link href="/escalaciones" className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}
