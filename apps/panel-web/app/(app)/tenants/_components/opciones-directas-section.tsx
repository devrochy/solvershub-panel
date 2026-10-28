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
} from "@/lib/opciones-directas-bandera";

const TEXTOS = {
  ancla: "opciones-directas",
  prefijo: "opd",
  titulo: TITULO,
  descripcion: DESCRIPCION,
  etiqueta: "Encendidas en este negocio",
  estado: ESTADO,
  confirmarEncender,
  confirmarApagar,
  avisoDeExito,
  mensajeDeError,
};

/** Interruptor «Plantillas con opciones» del negocio (SPEC-40, PR 10b). Solo lo monta el master. */
export function OpcionesDirectasSection({
  tenantId,
  negocio,
  enfocar = false,
}: {
  tenantId: string;
  /** Nombre visible del negocio, para las confirmaciones. */
  negocio: string;
  /** Llega por el enlace del editor: desplaza la vista aquí y deja el foco en el interruptor. */
  enfocar?: boolean;
}) {
  return (
    <BanderaDeNegocioSection
      tenantId={tenantId}
      negocio={negocio}
      enfocar={enfocar}
      url={`/api/platform/tenants/${tenantId}/opciones-directas`}
      textos={TEXTOS}
    />
  );
}
