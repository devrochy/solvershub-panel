"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error de una página del panel (HU-UI-03): dice qué pasó y cómo seguir, en español, sin
 * tumbar el menú ni la barra superior. «Reintentar» vuelve a pedir los datos (`retry`).
 */
export default function ErrorDePagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-status-warning-fg" aria-hidden />
      <h1 className="font-display text-sh-h1 text-headline">No se pudo cargar esta página</h1>
      <p className="text-sm text-body">
        Puede ser un problema de conexión o del servidor. Reintenta en unos segundos; si sigue
        pasando, avísanos con la hora en que ocurrió
        {error.digest ? ` y este código: ${error.digest}` : ""}.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ir al Resumen</Link>
        </Button>
      </div>
    </div>
  );
}
