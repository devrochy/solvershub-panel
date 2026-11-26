import type { ReactNode } from "react";

import { Marca } from "@/components/ui/marca";

/** Lo que muestra el escenario en una estación de la bienvenida. */
export type EscenarioDeLaEstacion = {
  /** El nombre del agente (franja del celular). */
  agente: string;
  titulo: string;
  bajada?: string;
  /** Más corta para la franja del celular; si falta, va `bajada`. */
  bajadaCorta?: string;
  /** El anillo de «listo» o la inicial, a la izquierda del título. */
  destacado?: ReactNode;
  leyenda?: string;
  children?: ReactNode;
};

/**
 * Marco a pantalla completa de la bienvenida (HU-UX-26, D-SPEC-52-2, tablero `E1-E-bienvenida`, que enmienda
 * D-SPEC-49-7): arriba, a todo el ancho, el logo horizontal y `extremo` («Seguir después») a la derecha; debajo,
 * la ruta. El celular va a la derecha, dentro de `RecorridoDelAgente`, como en Nuevo agente. Lo usan la estación
 * 1 (`/bienvenida`) y las 2 a 5 (el editor del agente en modo bienvenida).
 *
 * `EscenarioDeLaEstacion` queda solo para el escenario del catálogo hasta que se retire en HU-UX-31.
 */
export function MarcoDeBienvenida({
  extremo,
  children,
}: {
  /** A la derecha del logo: «Seguir después». */
  extremo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border-soft px-4 py-3 md:px-8">
        <Marca pieza="horizontal" className="h-7 w-auto sm:h-8" />
        {extremo}
      </header>
      <main id="contenido" className="flex w-full min-w-0 flex-1 flex-col px-4 pt-6 md:px-6 lg:pt-8 xl:px-8">
        {children}
      </main>
    </div>
  );
}
