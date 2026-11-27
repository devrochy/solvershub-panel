import Link from "next/link";
import { AlertCircle } from "lucide-react";

import type { Requirement } from "@/lib/api/types";
import { copiaDelRequisito, lugarDeLaRuta } from "@/lib/requisitos-de-agente";

/**
 * «Te falta configurar»: lo que el negocio debe completar para que el agente funcione (HU-AOS-50).
 * Es un aviso con la salida a mano, no un bloqueo. Sin avisos no pinta nada.
 */
export function AvisoDeRequisitos({
  requisitos,
  titulo = "Te falta configurar para que funcione",
  bajada,
  sinEnlaces = false,
  className,
}: {
  requisitos: Requirement[];
  titulo?: string;
  /** Una línea bajo el título, por ejemplo «Esto lo haces ahora o después.» (HU-UX-28). */
  bajada?: string;
  /**
   * Sin enlaces, con texto de dónde se hace después (HU-UX-28): en la bienvenida el panel no se abre mientras el
   * recorrido está pendiente (decisión del dueño, 2026-11-26).
   */
  sinEnlaces?: boolean;
  className?: string;
}) {
  if (requisitos.length === 0) return null;
  return (
    <div
      role="status"
      className={`flex flex-col gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm ${className ?? ""}`}
    >
      <p className="flex items-center gap-2 font-medium text-status-warning-fg">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {titulo}
      </p>
      {bajada && <p className="text-body">{bajada}</p>}
      <ul className="flex flex-col gap-2">
        {requisitos.map((r) => {
          const copia = copiaDelRequisito(r);
          return (
            <li key={`${r.skill}-${r.kind}`} className="flex flex-col gap-0.5">
              <span className="text-headline">{copia.titulo}</span>
              <span className="text-body">{copia.descripcion}</span>
              {sinEnlaces ? (
                <span className="text-text-soft">Lo haces después en {lugarDeLaRuta(copia.href)}.</span>
              ) : (
                <Link className="w-fit text-link underline" href={copia.href}>
                  {copia.accion}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
