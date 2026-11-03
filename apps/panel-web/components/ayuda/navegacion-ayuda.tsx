import Link from "next/link";

import { hrefDeAyuda, seccionesDeIndice, type EntradaDeIndice } from "@/lib/ayuda/paginas";

/**
 * Menú de la Wiki: solo lista las páginas del índice que recibe, que el servidor ya filtró por el
 * nivel de acceso de la sesión. Cada sección es un `<details>` nativo (teclado y lector de pantalla
 * sin JavaScript) y se abre la de la página actual.
 */
export function NavegacionAyuda({ entradas, slugActual }: { entradas: EntradaDeIndice[]; slugActual: string }) {
  const secciones = seccionesDeIndice(entradas);
  const portada = entradas.find((e) => e.slug === "");
  return (
    <nav aria-label="Contenido de la Wiki" className="text-sm">
      <ul className="flex flex-col gap-1">
        {portada && (
          <li>
            <EnlaceDeAyuda entrada={portada} actual={slugActual === ""} etiqueta="Inicio de la Wiki" />
          </li>
        )}
        {secciones.map((seccion) => {
          const abierta = seccion.paginas.some((p) => p.slug === slugActual);
          return (
            <li key={seccion.titulo}>
              <details open={abierta} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-1.5 font-medium text-headline hover:bg-hover [&::-webkit-details-marker]:hidden">
                  {seccion.titulo}
                  <span aria-hidden className="text-text-soft transition-transform group-open:rotate-90">›</span>
                </summary>
                <ul className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                  {seccion.paginas.map((p) => (
                    <li key={p.slug}>
                      <EnlaceDeAyuda entrada={p} actual={p.slug === slugActual} />
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function EnlaceDeAyuda({ entrada, actual, etiqueta }: { entrada: EntradaDeIndice; actual: boolean; etiqueta?: string }) {
  return (
    <Link
      href={hrefDeAyuda(entrada.slug)}
      aria-current={actual ? "page" : undefined}
      className={
        actual
          ? "block rounded-md bg-hover px-2 py-1.5 font-medium text-headline"
          : "block rounded-md px-2 py-1.5 text-body hover:bg-hover hover:text-headline"
      }
    >
      {etiqueta ?? entrada.titulo}
    </Link>
  );
}
