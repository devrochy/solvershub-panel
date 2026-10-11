import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Marca } from "@/components/ui/marca";

export const metadata = { title: "Página no encontrada" };

/** 404 en español con salida al inicio (HU-UI-03). */
export default function NoEncontrada() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Marca pieza="wordmark" className="h-8 w-auto" />
      <h1 className="font-display text-sh-h1 text-headline">Esta página no existe</h1>
      <p className="max-w-md text-sm text-body">
        Puede que el enlace esté mal escrito o que la sección se haya movido. Desde el Resumen
        llegas a todo el panel.
      </p>
      <Button asChild>
        <Link href="/dashboard">Ir al Resumen</Link>
      </Button>
    </main>
  );
}
