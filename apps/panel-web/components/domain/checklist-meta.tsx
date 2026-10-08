"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { estadoCheck } from "@/lib/estado-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

type Paso = { key: string; label: string; link: string; done: boolean; notes: string };
type Check = { key: string; ok: boolean | null; detail: string | null };

/** Checklist de puesta en marcha de Meta (requisitos y producción). */
export function ChecklistMeta({
  kind,
  steps,
  checks = [],
}: {
  kind: "requirements" | "production";
  steps: Paso[];
  checks?: Check[];
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string>();
  const [notas, setNotas] = useState<Record<string, string>>(
    Object.fromEntries(steps.map((p) => [p.key, p.notes])),
  );
  const [error, setError] = useState<string>();
  const [checksEstado, setChecks] = useState<Check[]>(checks);

  async function correrChecks() {
    setGuardando("__checks__");
    setError(undefined);
    const res = await fetch("/api/meta/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    setGuardando(undefined);
    if (!res.ok) {
      setError("No se pudieron correr las comprobaciones.");
      return;
    }
    setChecks((await res.json().catch(() => [])) as Check[]);
  }

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
      setError("No se pudo guardar el paso.");
      return;
    }
    router.refresh();
  }

  const hechos = steps.filter((p) => p.done).length;

  return (
    <div className="flex flex-col gap-4">
      {checksEstado.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-5">
            <p className="text-sm font-medium text-headline">Comprobaciones automáticas</p>
            {checksEstado.map((c) => (
              <div key={c.key} className="flex items-start gap-2 text-sm">
                <Badge variant={estadoCheck(c.ok).variant}>{estadoCheck(c.ok).label}</Badge>
                <span className="text-body">
                  <span className="font-mono text-xs">{c.key}</span> — {c.detail ?? "sin detalle"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Badge variant={hechos === steps.length ? "success" : "neutral"}>
          {hechos}/{steps.length} pasos
        </Badge>
        <Button onClick={() => router.refresh()} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4" aria-hidden /> Actualizar
        </Button>
        {kind === "production" && (
          <Button
            disabled={guardando === "__checks__"}
            onClick={() => void correrChecks()}
            size="sm"
            variant="accent"
          >
            <Activity className="h-4 w-4" aria-hidden />
            {guardando === "__checks__" ? "Corriendo…" : "Correr comprobaciones"}
          </Button>
        )}
        <FormFeedback error={error} />
      </div>

      <div className="flex flex-col gap-2">
        {steps.map((paso) => (
          <Card key={paso.key}>
            <CardContent className="flex flex-wrap items-center gap-3 pt-5">
              <input
                aria-label={`Marcar ${paso.label}`}
                checked={paso.done}
                className="h-4 w-4"
                disabled={guardando === paso.key}
                onChange={(e) => void guardar(paso, e.target.checked)}
                type="checkbox"
              />
              <span className={paso.done ? "text-body line-through" : "text-headline"}>
                {paso.label}
              </span>
              <a
                className="inline-flex items-center gap-1 text-xs text-link hover:underline"
                href={paso.link}
                rel="noreferrer"
                target="_blank"
              >
                Meta <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <div className="ml-auto flex items-center gap-2">
                <Input
                  aria-label={`Nota de ${paso.label}`}
                  className="h-8 w-56"
                  onChange={(e) => setNotas((previo) => ({ ...previo, [paso.key]: e.target.value }))}
                  placeholder="Nota"
                  value={notas[paso.key] ?? ""}
                />
                <Button
                  aria-label={`Guardar nota de ${paso.label}`}
                  disabled={guardando === paso.key}
                  onClick={() => void guardar(paso, paso.done)}
                  size="icon"
                  title="Guardar nota"
                  variant="outline"
                >
                  <Check className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {kind === "production" && (
        <p className="text-sm text-body">
          Marca los pasos a medida que los completas; el estado queda guardado por negocio.
        </p>
      )}
    </div>
  );
}
