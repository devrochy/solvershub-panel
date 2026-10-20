"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { DatosRetirados, EstadoDatosDePrueba, LoteGenerado } from "@/lib/api/types";
import {
  conteoLegible,
  IR_A_IDENTIDAD,
  llamarDatosDePrueba,
  resumenDelLote,
} from "@/lib/datos-de-prueba";
import { toast } from "@/lib/toast-store";

/**
 * «Generar datos de prueba» en la ficha del agente (HU-QA-10, solo en test). Genera con IA según la
 * descripción del negocio (o con la plantilla del pack si la IA falla), reemplaza el lote anterior
 * del agente y no toca lo creado a mano. Sin descripción, lleva a Configuración › Identidad.
 */
export function DatosDePruebaDelAgente({
  agenteId,
  nombre,
  estado,
}: {
  agenteId: string;
  nombre: string;
  estado: EstadoDatosDePrueba;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [trabajando, setTrabajando] = useState<"generar" | "borrar" | null>(null);
  const lote = estado.lote ?? null;

  if (!estado.disponible) {
    return (
      <Button variant="outline" disabled title={estado.motivo ?? undefined}>
        <Sparkles aria-hidden /> Datos de prueba no disponibles
      </Button>
    );
  }

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
        title: `¿Generar datos de prueba nuevos para ${nombre}?`,
        description: `Se reemplazan los datos de prueba anteriores (${conteoLegible(lote.conteos)}). Lo que creaste a mano no cambia.`,
        confirmLabel: "Generar de nuevo",
        destructive: false,
      });
      if (!ok) return;
    }
    setTrabajando("generar");
    const r = await llamarDatosDePrueba<LoteGenerado>(agenteId, "POST");
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
      title: `¿Borrar los datos de prueba de ${nombre}?`,
      description: `Se retiran ${conteoLegible(lote.conteos)} creados por «Generar datos de prueba». Lo que creaste a mano no cambia.`,
      confirmLabel: "Borrar datos de prueba",
    });
    if (!ok) return;
    setTrabajando("borrar");
    const r = await llamarDatosDePrueba<DatosRetirados>(agenteId, "DELETE");
    setTrabajando(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Datos de prueba borrados.");
    router.refresh();
  }

  return (
    <>
      {lote && (
        <Button variant="ghost" onClick={borrar} loading={trabajando === "borrar"} disabled={trabajando !== null}>
          <Trash2 aria-hidden /> Borrar datos de prueba
        </Button>
      )}
      <Button variant="accent" onClick={generar} loading={trabajando === "generar"} disabled={trabajando !== null}>
        <Sparkles aria-hidden /> {trabajando === "generar" ? "Generando…" : "Generar datos de prueba"}
      </Button>
    </>
  );
}
