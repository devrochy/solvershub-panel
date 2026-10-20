"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { EstadoDatosDePrueba, LoteGenerado } from "@/lib/api/types";
import { conteoLegible, IR_A_IDENTIDAD, llamarDatosDePrueba } from "@/lib/datos-de-prueba";
import { toast } from "@/lib/toast-store";

type Agente = { id: string; name: string };

/**
 * «Generar para todos» en la lista de agentes (HU-QA-11, solo en test): genera los datos de prueba
 * de cada especialista que los tenga, uno tras otro (nunca en paralelo: una llamada a la IA a la
 * vez), con el progreso en el botón y un resumen al final. Si uno falla, sigue con los demás.
 */
export function DatosDePruebaParaTodos({ agentes }: { agentes: Agente[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);

  async function generar() {
    const ok = await confirmar({
      title: "¿Generar datos de prueba para todos los agentes?",
      description:
        "Cada especialista recibe datos parecidos a tu negocio (catálogo, agenda, cartera o planes) y se reemplazan los de prueba anteriores. Lo que creaste a mano no cambia.",
      confirmLabel: "Generar para todos",
      destructive: false,
    });
    if (!ok) return;
    const listos: string[] = [];
    const fallidos: string[] = [];
    setProgreso({ hecho: 0, total: agentes.length });
    for (const [i, agente] of agentes.entries()) {
      const estado = await llamarDatosDePrueba<EstadoDatosDePrueba>(agente.id, "GET");
      if (estado.ok && estado.data.falta_descripcion) {
        setProgreso(null);
        toast.error("Escribe la descripción de tu negocio en Configuración › Identidad antes de generar.");
        router.push(IR_A_IDENTIDAD);
        return;
      }
      if (estado.ok && estado.data.disponible) {
        const r = await llamarDatosDePrueba<LoteGenerado>(agente.id, "POST");
        if (r.ok) listos.push(`${agente.name}: ${conteoLegible(r.data.conteos)}`);
        else fallidos.push(`${agente.name} (${r.error})`);
      } else if (!estado.ok) {
        fallidos.push(`${agente.name} (${estado.error})`);
      }
      setProgreso({ hecho: i + 1, total: agentes.length });
    }
    setProgreso(null);
    if (listos.length) toast.success(`Datos de prueba listos. ${listos.join(" · ")}`);
    if (fallidos.length) toast.error(`No se generaron: ${fallidos.join(" · ")}`);
    if (!listos.length && !fallidos.length) toast.error("Ningún agente tiene datos de prueba que generar.");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={generar} loading={progreso !== null} disabled={progreso !== null}>
      <Sparkles aria-hidden />
      {progreso ? `Generando ${Math.min(progreso.hecho + 1, progreso.total)} de ${progreso.total}…` : "Generar datos de prueba"}
    </Button>
  );
}
