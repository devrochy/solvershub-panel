"use client";

import * as RadioPrimitive from "@radix-ui/react-radio-group";

import { AgentIcon } from "@/components/domain/agent-icon";
import type { AgentTemplate } from "@/lib/api/types";
import { habilidadLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Primer paso de «Nuevo agente» (AGT-12): cada plantilla es una tarjeta que dice lo que sabe hacer y
 * lo que falta preparar antes de crearla. Las no disponibles dicen cómo pedirlas. Es un grupo de
 * radios (flechas, Espacio): se puede elegir una no disponible y el asistente no deja avanzar.
 */
export function PlantillasEnTarjetas({
  plantillas,
  value,
  onValueChange,
}: {
  plantillas: AgentTemplate[];
  value: string | undefined;
  onValueChange: (key: string) => void;
}) {
  return (
    <RadioPrimitive.Root
      aria-label="Qué quieres que haga tu agente"
      name="tipo-de-agente"
      value={value}
      onValueChange={onValueChange}
      className="grid gap-3 sm:grid-cols-2"
    >
      {plantillas.map((p) => {
        const sabe = p.superpowers.map((s) => s.title);
        const falta = p.requirements.map((r) => r.title);
        return (
          <RadioPrimitive.Item
            key={p.key}
            value={p.key}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border bg-surface p-4 text-left transition-colors duration-150",
              "border-border-soft hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "data-[state=checked]:border-focus data-[state=checked]:bg-accent/8",
            )}
          >
            <span className="flex w-full items-center gap-2">
              <AgentIcon agentKey={p.key} name={p.name} />
              <span className="font-display text-sh-block text-headline">{p.name}</span>
              {!p.available && <span className="ml-auto text-xs text-text-soft">No disponible</span>}
            </span>
            <span className="text-sm text-body">{p.description}</span>
            {!p.available ? (
              <span className="text-xs text-text-soft">No está en tu servicio por ahora. Pídela a SolversHub.</span>
            ) : (
              <>
                {sabe.length > 0 && (
                  <span className="text-xs text-text-soft">
                    <span className="font-medium text-headline">Sabe hacer:</span> {sabe.join(", ")}
                  </span>
                )}
                {p.will_enable.length > 0 && (
                  <span className="text-xs text-text-soft">
                    <span className="font-medium text-headline">El agente viene con:</span> {p.will_enable.map(habilidadLabel).join(", ")}
                  </span>
                )}
                {falta.length > 0 && (
                  <span className="text-xs text-status-warning-fg">
                    <span className="font-medium">Te falta:</span> {falta.join(", ")}
                  </span>
                )}
              </>
            )}
          </RadioPrimitive.Item>
        );
      })}
    </RadioPrimitive.Root>
  );
}
