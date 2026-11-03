import { ETIQUETA_DE_NIVEL, type NivelAyuda } from "@/lib/ayuda/acceso";
import type { EntradaDeIndice, PaginaAyuda } from "@/lib/ayuda/paginas";

import { NavegacionAyuda } from "@/components/ayuda/navegacion-ayuda";

/**
 * Una página de la Wiki con su menú. El HTML sale de `lib/ayuda/contenido.generado.json`, que
 * el script de sincronización renderizó y saneó (lista blanca de etiquetas, sin scripts ni
 * manejadores); aquí solo se inserta.
 */
export function PaginaDeAyuda({ pagina, indice }: { pagina: PaginaAyuda; indice: EntradaDeIndice[] }) {
  const etiquetaDeNivel = ETIQUETA_DE_NIVEL[pagina.acceso as NivelAyuda] ?? null;
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="lg:sticky lg:top-0 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <NavegacionAyuda entradas={indice} slugActual={pagina.slug} />
      </div>
      <article aria-label={pagina.titulo} className="min-w-0 max-w-3xl pb-12">
        {(pagina.seccion || etiquetaDeNivel) && (
          <p className="mb-3 text-xs text-text-soft">
            {pagina.seccion}
            {pagina.seccion && etiquetaDeNivel && " · "}
            {etiquetaDeNivel}
          </p>
        )}
        <div className="ayuda-contenido" dangerouslySetInnerHTML={{ __html: pagina.html }} />
      </article>
    </div>
  );
}
