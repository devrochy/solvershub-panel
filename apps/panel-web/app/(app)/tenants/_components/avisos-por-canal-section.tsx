"use client";

import { BanderaDeNegocioSection } from "@/app/(app)/tenants/_components/bandera-negocio-section";
import {
  DESCRIPCION,
  ESTADO,
  TITULO,
  avisoDeExito,
  confirmarApagar,
  confirmarEncender,
  mensajeDeError,
} from "@/lib/avisos-por-canal-bandera";

const TEXTOS = {
  ancla: "avisos-por-canal",
  prefijo: "apc",
  titulo: TITULO,
  descripcion: DESCRIPCION,
  etiqueta: "Encendidos en este negocio",
  estado: ESTADO,
  confirmarEncender,
  confirmarApagar,
  avisoDeExito,
  mensajeDeError,
};

/** Interruptor «Avisos por canal» del negocio (ADR-0178 D2). Solo lo monta el master. */
export function AvisosPorCanalSection({
  tenantId,
  negocio,
}: {
  tenantId: string;
  /** Nombre visible del negocio, para las confirmaciones. */
  negocio: string;
}) {
  return (
    <BanderaDeNegocioSection
      tenantId={tenantId}
      negocio={negocio}
      url={`/api/platform/tenants/${tenantId}/avisos-por-canal`}
      textos={TEXTOS}
    />
  );
}
