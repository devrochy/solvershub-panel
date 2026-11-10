"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import type { EscalationItem } from "@/lib/api/types";
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

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "asignada", label: "Asignadas" },
  { value: "resuelta", label: "Resueltas" },
];

function hrefDeFiltros(motivo?: string, estado?: string): string {
  const qs = new URLSearchParams();
  if (motivo) qs.set("reason_code", motivo);
  if (estado) qs.set("estado", estado);
  return `/escalaciones${qs.size ? `?${qs}` : ""}`;
}

/** Filtros de Escalaciones: el estado con el mismo control de la bandeja y el motivo en un selector. */
export function EscalacionFilters({ motivo, estado }: { motivo?: string; estado?: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SegmentedControl
        label="Filtrar por estado"
        className="w-full sm:w-96"
        value={estado ?? ""}
        options={ESTADOS.map((opcion) => ({ ...opcion, href: hrefDeFiltros(motivo, opcion.value) }))}
      />
      <span aria-hidden className="h-6 w-px bg-border max-sm:hidden" />
      <div className="flex items-center gap-2">
        <label htmlFor="reason_code" className="text-sh-label text-body">
          Motivo
        </label>
        <Select
          key={motivo ?? ""}
          id="reason_code"
          className="w-56"
          defaultValue={motivo ?? ""}
          onChange={(e) => router.push(hrefDeFiltros(e.target.value, estado))}
        >
          <option value="">Todos los motivos</option>
          {Object.entries(ESCALACION).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
