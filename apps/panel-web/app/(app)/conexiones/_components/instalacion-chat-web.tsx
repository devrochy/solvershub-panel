import { BotonCopiar } from "@/components/domain/boton-copiar";
import { Card, CardContent } from "@/components/ui/card";

/** Fragmento del chat web para pegar en el sitio (pestaña Instalación de la ficha, HU-UX-09; CON-22). */
export function InstalacionChatWeb({ snippet }: { snippet: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        {snippet ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-headline">Fragmento para tu sitio</p>
              <BotonCopiar texto={snippet} etiqueta="Copiar fragmento" />
            </div>
            <pre className="overflow-x-auto rounded-md bg-bg-deep px-3 py-3 font-mono text-xs text-body">
              <code>{snippet}</code>
            </pre>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-body">
              <li>Copia el fragmento.</li>
              <li>
                Pégalo antes de cerrar la etiqueta <code>&lt;/body&gt;</code> en cada página donde quieras el chat.
              </li>
              <li>Revisa que el dominio de tu sitio esté en Apariencia: solo ahí aparece el chat.</li>
            </ol>
          </>
        ) : (
          <p className="text-sm text-body">Activa el chat web en Apariencia y guarda para generar el fragmento.</p>
        )}
      </CardContent>
    </Card>
  );
}
