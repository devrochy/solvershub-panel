import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { InicialDelAgente } from "./escenario-piezas";

/**
 * Escenario como tarjeta de 340 px a la derecha, dentro del panel (Nuevo agente, HU-UX-24, D-SPEC-49-7).
 * Siempre oscura y redondeada: arriba el agente (inicial, nombre y estado, por ejemplo «Borrador») con
 * una acción opcional, y debajo lo que gana en esta estación. En el celular se usa `FranjaDelEscenario`.
 */
export function EscenarioTarjeta({
  agente,
  estado,
  accion,
  leyenda,
  children,
  className,
}: {
  agente: string;
  /** Debajo del nombre: «Borrador», «Agenda»… */
  estado?: string;
  /** A la derecha del encabezado, por ejemplo la `BarraRecomendado` compacta. */
  accion?: ReactNode;
  leyenda?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-theme="sh-dark"
      aria-label={`Lo que gana ${agente || "tu agente"}`}
      className={cn("flex w-full flex-col gap-4 overflow-hidden rounded-3xl bg-escena p-5 text-escena-texto lg:w-[340px]", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InicialDelAgente nombre={agente} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight">{agente || "Tu agente"}</p>
            {estado && <p className="text-sm text-escena-texto-suave">{estado}</p>}
          </div>
        </div>
        {accion}
      </div>
      {children && <div className="flex min-h-0 flex-col gap-3">{children}</div>}
      {leyenda && <p className="mt-auto text-center text-sm text-escena-texto-suave">{leyenda}</p>}
    </aside>
  );
}
