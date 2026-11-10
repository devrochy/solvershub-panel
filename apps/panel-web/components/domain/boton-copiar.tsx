"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Copia un texto al portapapeles y lo confirma en el mismo botón durante un momento. */
export function BotonCopiar({ texto, etiqueta = "Copiar", variant = "outline" }: { texto: string; etiqueta?: string; variant?: "outline" | "ghost" }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Button type="button" variant={variant} onClick={() => void copiar()} aria-live="polite">
      {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copiado ? "Copiado" : etiqueta}
    </Button>
  );
}
