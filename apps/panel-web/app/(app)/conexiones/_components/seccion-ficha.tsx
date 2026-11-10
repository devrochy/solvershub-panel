import type { ReactNode } from "react";

/**
 * Encabezado de una pestaña de la ficha de conexión (HU-UX-09): el `h1` es el nombre de la
 * conexión (layout), así que cada pestaña abre con un `h2`, su descripción y sus acciones.
 */
export function SeccionFicha({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="ficha-seccion" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ficha-seccion" className="font-display text-sh-block text-headline">
            {titulo}
          </h2>
          {descripcion && <p className="mt-1 max-w-2xl text-sm text-body">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </section>
  );
}
