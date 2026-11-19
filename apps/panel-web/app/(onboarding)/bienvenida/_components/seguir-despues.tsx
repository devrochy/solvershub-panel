"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { textosDeSeguirDespues } from "@/lib/onboarding";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

/**
 * «Seguir después» de la bienvenida (HU-UX-25): confirma que el agente no atiende hasta terminar y que lo hecho
 * queda guardado, guarda lo que falte de la estación (`guardar`, si la estación tiene algo propio sin guardar) y
 * deja el recorrido omitido: el aviso persistente lo retoma desde Inicio. Va en la ruta (escritorio) y en la
 * franja del escenario (celular).
 */
export function SeguirDespues({
  nombreDelAgente,
  guardar,
  ocupado = false,
  enEscenario = false,
  className,
}: {
  nombreDelAgente: string;
  /** Guarda lo de la estación antes de salir; `false` = no se pudo y no se sale. */
  guardar?: () => Promise<boolean>;
  ocupado?: boolean;
  /** Sobre la franja oscura del celular. */
  enEscenario?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [saliendo, setSaliendo] = useState(false);

  async function omitir() {
    const textos = textosDeSeguirDespues(nombreDelAgente);
    const seguro = await confirmar({
      title: textos.titulo,
      description: textos.detalle,
      confirmLabel: "Terminar después",
      cancelLabel: "Seguir ahora",
      destructive: false,
    });
    if (!seguro) return;
    setSaliendo(true);
    if (guardar && !(await guardar())) {
      setSaliendo(false);
      return;
    }
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
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void omitir()}
      disabled={ocupado || saliendo}
      className={cn("min-h-11", enEscenario ? "text-escena-acento hover:bg-escena-tarjeta" : "text-link", className)}
    >
      Seguir después
    </Button>
  );
}
