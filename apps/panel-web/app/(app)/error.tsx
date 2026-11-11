"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error de una página del panel (HU-UI-03): dice qué pasó y cómo seguir, en español, sin
 * tumbar el menú ni la barra superior. Se ve como `ErrorDeCarga`, pero lleva el h1 de la página.
 * «Reintentar» vuelve a pedir los datos (`retry`).
 */
export default function ErrorDePagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-lg border border-border-soft bg-surface">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2.5 px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-status-danger-bg text-status-danger-fg">
          <AlertCircle className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="font-display text-sh-block text-headline">No se pudo cargar esta página</h1>
        <p className="max-w-sm text-sm text-body">
          Puede ser un problema de conexión o del servidor. Reintenta en unos segundos; si sigue pasando, avísanos con
          la hora en que ocurrió{error.digest ? ` y este código: ${error.digest}` : ""}.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>Reintentar</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Ir al Resumen</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
