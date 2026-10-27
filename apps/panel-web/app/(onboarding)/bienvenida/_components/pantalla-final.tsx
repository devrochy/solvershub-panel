"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Marca } from "@/components/ui/marca";

/** Cierre del recorrido: el agente quedó listo y lo siguiente es conectar WhatsApp. */
export function PantallaFinal({ nombreDelAgente }: { nombreDelAgente: string }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-8 px-4 py-12">
      <Marca pieza="horizontal" className="h-20 w-auto" />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-sh-h1 text-headline">{nombreDelAgente || "Tu agente"} ya está listo</h1>
        <p className="text-body">
          Lo dejamos publicado en un chat de pruebas, cerrado al público. Cuando quieras que atienda a tus clientes, conecta tu WhatsApp:
          es el siguiente paso.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" variant="accent">
          <Link href="/conexiones">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Conectar mi WhatsApp
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">Ir al Resumen</Link>
        </Button>
      </div>
    </main>
  );
}
