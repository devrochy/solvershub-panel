"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { MarcaDeRevision } from "@/components/domain/marca-de-revision";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { estadoCheck } from "@/lib/estado-check";

type Paso = { key: string; label: string; link: string; done: boolean; notes: string };
type Check = { key: string; ok: boolean | null; detail: string | null };

/**
 * Requisitos de Meta (CON-26): los pasos que se hacen a mano en Meta, cada uno con su casilla,
 * su enlace y una nota que se guarda al salir del campo; debajo, lo que se revisa solo.
 * El checklist de producción es por conexión (HU-CONN-07, `ChecklistProduccion`).
 */
export function ChecklistMeta({ steps, checks = [] }: { steps: Paso[]; checks?: Check[] }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string>();
  const [notas, setNotas] = useState<Record<string, string>>(Object.fromEntries(steps.map((p) => [p.key, p.notes])));
  const [error, setError] = useState<string>();

  async function guardar(paso: Paso, done: boolean) {
    setGuardando(paso.key);
    setError(undefined);
    const res = await fetch("/api/meta/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step_key: paso.key, done, notes: notas[paso.key] ?? "" }),
    });
    setGuardando(undefined);
    if (!res.ok) {
      setError("No se pudo guardar el paso. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }

  const hechos = steps.filter((p) => p.done).length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle as="h2">Pasos en Meta</CardTitle>
            <span className="text-sm text-text-soft">
              {hechos} de {steps.length} listos
            </span>
          </div>
          <Progress value={hechos} max={Math.max(steps.length, 1)} label="Pasos listos" valueText={`${hechos} de ${steps.length}`} />
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            {steps.map((paso) => (
              <li key={paso.key} className="flex flex-col gap-2 border-t border-border-soft py-3 first:border-t-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Checkbox
                    id={`paso-meta-${paso.key}`}
                    label={paso.label}
                    checked={paso.done}
                    disabled={guardando === paso.key}
                    onCheckedChange={(v) => void guardar(paso, v)}
                    className="min-h-11 flex-1"
                  />
                  <a
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-link hover:underline"
                    href={paso.link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir en Meta <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                </div>
                <Input
                  aria-label={`Nota de ${paso.label}`}
                  className="sm:ml-6 sm:max-w-md"
                  onChange={(e) => setNotas((previo) => ({ ...previo, [paso.key]: e.target.value }))}
                  onBlur={() => {
                    if ((notas[paso.key] ?? "") !== paso.notes) void guardar(paso, paso.done);
                  }}
                  placeholder="Agrega una nota (se guarda sola)"
                  value={notas[paso.key] ?? ""}
                />
              </li>
            ))}
          </ul>
          <FormFeedback error={error} />
        </CardContent>
      </Card>

      {checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Lo que revisamos solos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {checks.map((c) => (
                <li key={c.key} className="flex items-center gap-3 border-t border-border-soft py-3 text-sm first:border-t-0">
                  <MarcaDeRevision ok={c.ok} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-headline">{c.detail ?? c.key}</span>
                    <span className="text-xs text-text-soft">{estadoCheck(c.ok).label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
