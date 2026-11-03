import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Página de ayuda no encontrada" };

/**
 * 404 de la Wiki, dentro del panel. Es el mismo para una página que no existe y para una que el
 * nivel de acceso de quien lee no alcanza: no debe distinguirlas.
 */
export default function AyudaNoEncontrada() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-sh-h1 text-headline">Esta página de ayuda no existe</h1>
      <p className="text-sm text-body">
        Puede que el enlace esté mal escrito o que la página se haya movido. Desde el inicio de la Wiki
        llegas a todo lo que puedes consultar.
      </p>
      <Button asChild>
        <Link href="/ayuda">Ir al inicio de la Wiki</Link>
      </Button>
    </div>
  );
}
