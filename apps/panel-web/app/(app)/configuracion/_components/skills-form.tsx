"use client";

import { useState } from "react";
import Link from "next/link";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InputNumero } from "@/components/ui/input-numero";
import { Switch } from "@/components/ui/switch";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { igualProfundo } from "@/lib/configuracion-secciones";
import { useAction } from "@/lib/use-action";

type SkillBinding = {
  name: string;
  plugin_id: string;
  description?: string | null;
  enabled: boolean;
  max_calls_per_conversation?: number | null;
  requires_confirmation: boolean;
};

/**
 * Las acciones ahora se controlan en cada agente (fase 5a de la SPEC «habilidades por agente», ADR-0190 en
 * preparación). La sección sigue mientras dure la transición; este aviso lleva a Agentes.
 */
export function AvisoAccionesPorAgente() {
  return (
    <p role="note" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
      Ahora se controla en cada agente: abre el agente, pulsa Editar y ve al paso «Acciones».{" "}
      <Link href="/agentes" className="font-medium underline underline-offset-2">
        Ir a Agentes
      </Link>
    </p>
  );
}

/** Herramientas del agente: activar, límite por conversación (0 = sin límite) y confirmación. */
export function SkillsForm({
  skills,
  puedeEditar = true,
  onGuardado,
}: {
  skills: SkillBinding[];
  puedeEditar?: boolean;
  /** Tras guardar bien: el cajón se cierra. */
  onGuardado?: () => void;
}) {
  const [values, setValues] = useState(skills);
  const [guardado, setGuardado] = useState(skills);
  const { run, pending } = useAction();
  useAvisarCambios("herramientas", !igualProfundo(values, guardado));

  function update(name: string, patch: Partial<SkillBinding>) {
    setValues((prev) => prev.map((tool) => (tool.name === name ? { ...tool, ...patch } : tool)));
  }

  async function onSubmit() {
    const ok = await run(async () => {
      const res = await fetch("/api/settings/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools: values }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudieron guardar las herramientas." };
      setGuardado(values);
      return { ok: true, success: "Herramientas guardadas." };
    });
    if (ok) onGuardado?.();
  }

  // Sin habilidades no hay herramientas: nada que guardar, y el camino es encender una (CFG-05).
  if (values.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <AvisoAccionesPorAgente />
        </CardContent>
        <EmptyState
          title="Todavía no hay herramientas"
          description="Las herramientas llegan con las habilidades. Enciende una para elegir qué puede hacer el asistente."
          action={
            <Button asChild variant="outline">
              <Link href="/habilidades">Ver las habilidades</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <AvisoAccionesPorAgente />
        <p className="text-xs text-text-soft">
          Cada herramienta es una acción concreta que el asistente puede hacer (agendar, consultar, cobrar…). Aquí
          apagas las que no quieres que use, le pones un tope de usos por conversación y decides si pide confirmación al
          cliente antes de ejecutarlas. Las habilidades del negocio se activan en Habilidades.
        </p>
        <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-4">
        {values.length === 0 ? (
          <p className="text-sm text-text-soft">
            No hay herramientas disponibles: activa una habilidad primero.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {values.map((tool) => (
              <li key={tool.name} className="flex flex-wrap items-center gap-4 py-3">
                <Switch
                  checked={tool.enabled}
                  onCheckedChange={(checked) => update(tool.name, { enabled: checked })}
                  aria-label={`Habilitar ${tool.name}`}
                />
                <div className="flex min-w-52 flex-1 flex-col">
                  <span className="text-sm text-headline">{tool.description || tool.name}</span>
                  {tool.description && <span className="text-xs text-text-soft">{tool.name}</span>}
                </div>
                <label className="flex flex-col gap-1 text-xs text-body">
                  Límite por conversación
                  <InputNumero
                    min={0}
                    className="h-9 w-20"
                    value={tool.max_calls_per_conversation ?? 0}
                    onValueChange={(n) => update(tool.name, { max_calls_per_conversation: n || null })}
                    aria-label={`Límite por conversación de ${tool.name}`}
                  />
                  <span className="text-text-soft">0 = sin límite</span>
                </label>
                <label className="flex flex-col gap-1 text-xs text-body">
                  <span className="flex items-center gap-2">
                    <Switch
                      checked={tool.requires_confirmation}
                      onCheckedChange={(checked) =>
                        update(tool.name, { requires_confirmation: checked })
                      }
                      aria-label={`Confirmación de ${tool.name}`}
                    />
                    Pedir confirmación
                  </span>
                  <span className="text-text-soft">El cliente confirma antes de ejecutarla.</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        </ControlesEditables>

        {puedeEditar ? (
          <div>
            <Button variant="accent" onClick={() => void onSubmit()} loading={pending}>
              Guardar
            </Button>
          </div>
        ) : (
          <AvisoSoloLectura />
        )}
      </CardContent>
    </Card>
  );
}
