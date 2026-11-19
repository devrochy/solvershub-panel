import type { ReactNode } from "react";

import { EscenarioPantallaCompleta, FranjaDelEscenario } from "./escenario-pantalla-completa";

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
 * Marco a pantalla completa de la bienvenida (HU-UX-25, tableros `rb1`–`rb5`): el escenario de 500 px a la
 * izquierda, siempre oscuro y con el logo actual, y la ruta a la derecha. Por debajo de `lg` el escenario pasa
 * a la franja de arriba (logo, `extremo` y una línea con lo que gana el agente). Lo usan la estación 1
 * (`/bienvenida`) y las 2 a 5 (el editor del agente en modo bienvenida): el contenido de cada estación lo decide
 * quien lo usa.
 */
export function MarcoDeBienvenida({
  escenario,
  extremo,
  children,
}: {
  escenario: EscenarioDeLaEstacion;
  /** En la franja del celular, a la derecha del logo («Seguir después»). */
  extremo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <EscenarioPantallaCompleta
        titulo={escenario.titulo}
        bajada={escenario.bajada}
        destacado={escenario.destacado}
        leyenda={escenario.leyenda}
        className="hidden shrink-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto"
      >
        {escenario.children}
      </EscenarioPantallaCompleta>
      <FranjaDelEscenario
        agente={escenario.agente}
        titulo={escenario.titulo}
        bajada={escenario.bajadaCorta ?? escenario.bajada}
        extremo={extremo}
        className="lg:hidden"
      />
      <main id="contenido" className="flex w-full min-w-0 flex-1 flex-col px-4 pt-6 md:px-6 lg:pt-8">
        <div className="mx-auto flex w-full max-w-[60rem] flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
