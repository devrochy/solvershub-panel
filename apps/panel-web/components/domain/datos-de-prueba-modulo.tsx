"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import type { EstadoDatosDePruebaModulo, LoteGenerado } from "@/lib/api/types";
import {
  conteoLegible,
  IR_A_IDENTIDAD,
  llamarDatosDePruebaDeModulo,
  MODULOS_DE_PRUEBA,
  resumenDelLote,
  type ModuloDatosDePrueba,
} from "@/lib/datos-de-prueba";
import { toast } from "@/lib/toast-store";

/**
 * Aviso y acciones de datos de prueba dentro de un módulo (HU-QA-10). Solo se renderiza cuando
 * la API de test responde: en producción la función no existe.
 */
export function DatosDePruebaDelModulo({
  modulo,
  estado,
}: {
  modulo: ModuloDatosDePrueba;
  estado: EstadoDatosDePruebaModulo;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [trabajando, setTrabajando] = useState<"generar" | "borrar" | null>(null);
  const copia = MODULOS_DE_PRUEBA[modulo];
  const lote = estado.lote ?? null;

  async function generar() {
    if (estado.falta_descripcion) {
      const ir = await confirmar({
        title: "Falta la descripción de tu negocio",
        description:
          "Los datos de prueba se generan a partir de lo que hace tu negocio. Escríbela en Configuración › Identidad y vuelve a intentarlo.",
        confirmLabel: "Ir a Identidad",
        destructive: false,
      });
      if (ir) router.push(IR_A_IDENTIDAD);
      return;
    }
    if (lote) {
      const ok = await confirmar({
        title: `¿Generar datos de prueba nuevos para ${copia.titulo}?`,
        description: `Se reemplazan los datos de prueba anteriores (${conteoLegible(lote.conteos)}). Lo que creaste a mano no cambia.`,
        confirmLabel: "Generar de nuevo",
        destructive: false,
      });
      if (!ok) return;
    }
    setTrabajando("generar");
    const r = await llamarDatosDePruebaDeModulo<LoteGenerado>(modulo, "POST");
    setTrabajando(null);
    if (!r.ok) {
      if (r.code === "descripcion_requerida") router.push(IR_A_IDENTIDAD);
      toast.error(r.error);
      return;
    }
    toast.success(resumenDelLote(r.data));
    router.refresh();
  }

  async function borrar() {
    if (!lote) return;
    const ok = await confirmar({
      title: `¿Borrar los datos de prueba de ${copia.titulo}?`,
      description: `Se retiran ${conteoLegible(lote.conteos)} creados por «Generar datos de prueba». Lo que creaste a mano no cambia.`,
      confirmLabel: "Borrar datos de prueba",
    });
    if (!ok) return;
    setTrabajando("borrar");
    const r = await llamarDatosDePruebaDeModulo<{ retirados: number }>(modulo, "DELETE");
    setTrabajando(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Datos de prueba borrados.");
    router.refresh();
  }

  if (!estado.disponible) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-text-soft" aria-hidden />
          <p className="text-sm text-body">
            {estado.motivo ?? "Este módulo no tiene datos de prueba que generar."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start gap-3 py-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-link" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-headline">Datos de prueba de {copia.titulo}</p>
          <p className="text-sm text-body">{copia.descripcion}</p>
          <p className="text-xs text-text-soft">{copia.aviso}</p>
          {lote ? (
            <p className="mt-1 text-xs text-text-soft">
              Último lote: {conteoLegible(lote.conteos)}.
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {lote && (
            <Button
              variant="ghost"
              onClick={borrar}
              loading={trabajando === "borrar"}
              disabled={trabajando !== null}
            >
              <Trash2 aria-hidden /> Borrar datos de prueba
            </Button>
          )}
          <Button
            variant="accent"
            onClick={generar}
            loading={trabajando === "generar"}
            disabled={trabajando !== null}
          >
            <Sparkles aria-hidden />
            {trabajando === "generar" ? "Generando…" : "Generar datos de prueba"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
