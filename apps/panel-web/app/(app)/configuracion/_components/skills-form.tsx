"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputNumero } from "@/components/ui/input-numero";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/lib/use-action";

type SkillBinding = {
  name: string;
  plugin_id: string;
  description?: string | null;
  enabled: boolean;
  max_calls_per_conversation?: number | null;
  requires_confirmation: boolean;
};

/** Herramientas del agente: activar, límite por conversación y confirmación. */
export function SkillsForm({ skills }: { skills: SkillBinding[] }) {
  const [values, setValues] = useState(skills);
  const { run, pending } = useAction();

  function update(name: string, patch: Partial<SkillBinding>) {
    setValues((prev) => prev.map((tool) => (tool.name === name ? { ...tool, ...patch } : tool)));
  }

  async function onSubmit() {
    await run(async () => {
      const res = await fetch("/api/settings/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools: values }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudieron guardar las herramientas." };
      return { ok: true, success: "Herramientas guardadas." };
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
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
                  <span className="font-mono text-xs text-headline">{tool.name}</span>
                  <span className="text-xs text-text-soft">
                    {tool.description ?? tool.plugin_id}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-body">
                  Límite/turno
                  <InputNumero
                    min={0}
                    className="h-9 w-20"
                    value={tool.max_calls_per_conversation ?? 0}
                    onValueChange={(n) => update(tool.name, { max_calls_per_conversation: n || null })}
                    aria-label={`Límite por conversación de ${tool.name}`}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-body">
                  <Switch
                    checked={tool.requires_confirmation}
                    onCheckedChange={(checked) =>
                      update(tool.name, { requires_confirmation: checked })
                    }
                    aria-label={`Confirmación de ${tool.name}`}
                  />
                  Confirmar
                </label>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Button variant="accent" onClick={() => void onSubmit()} disabled={pending}>
            {pending ? "Guardando…" : "Guardar herramientas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
