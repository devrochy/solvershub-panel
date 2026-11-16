"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Marca } from "@/components/ui/marca";
import { toast } from "@/lib/toast-store";

/**
 * Cabecera de la bienvenida (HU-UX-21, HU-UX-23): el logo horizontal con icono de siempre (variante por tema
 * y la simple en pantallas angostas, sin recolorear) y «Lo hago después», que pide confirmar y deja el
 * recorrido omitido con su aviso persistente.
 */
export function CabeceraDeBienvenida({ ocupado = false }: { ocupado?: boolean }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [saliendo, setSaliendo] = useState(false);

  async function omitir() {
    const seguro = await confirmar({
      title: "¿Dejarlo para después?",
      description:
        "Tu agente no estará listo para probar y no podrás operar SolversHub del todo. Verás un aviso en cada pantalla hasta que termines, y retomas donde te quedaste.",
      confirmLabel: "Lo hago después",
      cancelLabel: "Seguir ahora",
      destructive: false,
    });
    if (!seguro) return;
    setSaliendo(true);
    const res = await fetch("/api/onboarding/omitir", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(
      () => null,
    );
    if (!res?.ok) {
      setSaliendo(false);
      const json = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      toast.error(json?.error ?? "No se pudo dejar para después. Inténtalo de nuevo.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-4 md:px-6">
      <Marca pieza="horizontal-simple" className="h-9 w-auto" />
      <Button variant="ghost" size="sm" onClick={() => void omitir()} disabled={ocupado || saliendo}>
        Lo hago después
      </Button>
    </header>
  );
}
