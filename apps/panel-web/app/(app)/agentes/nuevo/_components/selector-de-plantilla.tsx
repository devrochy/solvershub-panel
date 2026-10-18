"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AgentTemplate } from "@/lib/api/types";
import { habilidadLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

/** Frases de ejemplo que se muestran por superpoder en la tarjeta (el resto se ve en el editor). */
const FRASES_DE_MUESTRA = 2;

/**
 * Plantillas de agente (HU-AOS-24). Al elegir una se crea el agente con su borrador y se abre el
 * editor. Si ya existe un agente de esa plantilla, se ofrece editarlo en vez de duplicarlo.
 */
export function SelectorDePlantilla({ plantillas }: { plantillas: AgentTemplate[] }) {
  const router = useRouter();
  const { run, pending } = useAction({ refresh: false });
  const [elegida, setElegida] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [existente, setExistente] = useState<{ key: string; id: string } | null>(null);

  async function crear(plantilla: AgentTemplate) {
    setElegida(plantilla.key);
    setExistente(null);
    await run(async () => {
      const res = await fetch(`/api/agent-editor/from-template/${plantilla.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        agentId?: string;
        error?: string;
        code?: string;
        fields?: Record<string, string>;
      };
      if (!res.ok) {
        if (json.code === "key_taken" && json.fields?.agent_id) setExistente({ key: plantilla.key, id: json.fields.agent_id });
        return { ok: false, status: res.status, error: json.error ?? "No se pudo crear el agente." };
      }
      router.push(`/agentes/${json.agentId}/editar`);
      return { ok: true, success: `Agente «${nombre.trim() || plantilla.name}» creado: ahora ajústalo y publícalo.` };
    });
  }

  if (plantillas.length === 0) {
    return <p className="text-sm text-body">Todavía no hay plantillas de agentes disponibles.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Nombre del agente (opcional)"
        htmlFor="nombre-agente"
        help="Si lo dejas vacío, se llama como la plantilla. Lo puedes cambiar después."
        className="max-w-md"
      >
        <Input id="nombre-agente" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
      </Field>

      <ul className="grid gap-4 md:grid-cols-2" aria-label="Plantillas de agentes">
        {plantillas.map((plantilla) => (
          <li key={plantilla.key}>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plantilla.name}</CardTitle>
                  {plantilla.available ? (
                    <Badge variant="success">Disponible</Badge>
                  ) : (
                    <Badge variant="warning">Falta una habilidad</Badge>
                  )}
                </div>
                <CardDescription>{plantilla.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {plantilla.superpowers.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-headline">Superpoderes</p>
                    <ul className="flex flex-col gap-2">
                      {plantilla.superpowers.map((poder) => (
                        <li key={poder.id} className="text-sm text-body">
                          <span className="text-headline">{poder.title}</span>
                          {poder.phrases.length > 0 && (
                            <span className="block text-text-soft">
                              Por ejemplo: {poder.phrases.slice(0, FRASES_DE_MUESTRA).map((f) => `«${f}»`).join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-body">
                    Activa la habilidad {plantilla.missing_skills.map(habilidadLabel).join(", ")} en Habilidades para usar esta plantilla.
                  </p>
                )}
                {existente?.key === plantilla.key && (
                  <p className="text-sm text-body">
                    Ya tienes un agente de esta plantilla.{" "}
                    <Link className="text-link underline" href={`/agentes/${existente.id}/editar`}>
                      Editarlo
                    </Link>
                  </p>
                )}
                <div className="mt-auto">
                  <Button
                    variant={plantilla.available ? "accent" : "outline"}
                    disabled={!plantilla.available || pending}
                    loading={pending && elegida === plantilla.key}
                    onClick={() => crear(plantilla)}
                  >
                    Crear desde {plantilla.name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
