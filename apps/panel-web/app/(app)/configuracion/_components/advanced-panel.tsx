"use client";

import { useState, type FormEvent } from "react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { useAction } from "@/lib/use-action";

/**
 * `GET /admin/settings/advanced`. Con el AgentSpec v2 retirado (HU-AOS-91) `versions`, `guardrails_text` y
 * `spec` llegan vacíos y no se usan; solo quedan el LLM propio y las corridas de evals.
 */
export type Advanced = {
  llm: { llm_provider: string; llm_model: string; has_api_key: boolean };
  flow: { source: string; sections: { label: string; purpose: string | null; tools: string[] }[]; unknown_tools: string[] };
  eval_runs: { id: string; status: string; score: number | null; created_at: string | null }[];
};

/** Cuenta y proveedor: LLM propio (BYOK) y últimas corridas de evals. */
export function AdvancedPanel({ advanced, puedeEditar = true }: { advanced: Advanced; puedeEditar?: boolean }) {
  const { run, pending } = useAction();
  const [llm, setLlm] = useState({ ...advanced.llm, llm_api_key: "" });
  // Lo último guardado: sirve para avisar si algo quedó sin guardar.
  const [guardado, setGuardado] = useState({ provider: advanced.llm.llm_provider, model: advanced.llm.llm_model });
  useAvisarCambios(
    "agentspec",
    llm.llm_provider !== guardado.provider || llm.llm_model !== guardado.model || llm.llm_api_key !== "",
  );

  async function onLlm(event: FormEvent) {
    event.preventDefault();
    const hecho = await run(async () => {
      const res = await fetch("/api/settings/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "llm", ...llm }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar." };
      return { ok: true, success: "Proveedor de IA actualizado." };
    });
    if (hecho) {
      setGuardado({ provider: llm.llm_provider, model: llm.llm_model });
      setLlm((prev) => ({ ...prev, llm_api_key: "", has_api_key: prev.has_api_key || prev.llm_api_key !== "" }));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p role="note" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
        Los guardrails y las tools de cada agente se configuran en el agente.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Proveedor LLM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onLlm} className="flex flex-col gap-4">
            <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Proveedor"
                htmlFor="llm_provider"
                help="La empresa de IA que genera las respuestas de este negocio, por ejemplo openai o anthropic."
              >
                <Input
                  id="llm_provider"
                  value={llm.llm_provider}
                  onChange={(e) => setLlm({ ...llm, llm_provider: e.target.value })}
                />
              </Field>
              <Field
                label="Modelo"
                htmlFor="llm_model"
                help="El modelo concreto de ese proveedor. Debe existir en el proveedor elegido."
              >
                <Input
                  id="llm_model"
                  value={llm.llm_model}
                  onChange={(e) => setLlm({ ...llm, llm_model: e.target.value })}
                />
              </Field>
            </div>
            <Field
              label="Llave de API (BYOK)"
              htmlFor="llm_api_key"
              help={llm.has_api_key ? "Ya hay una llave guardada; déjala vacía para conservarla." : "Sin llave, el negocio usa la del servidor."}
            >
              <InputPassword
                etiqueta="llave"
                id="llm_api_key"
                autoComplete="new-password"
                value={llm.llm_api_key}
                onChange={(e) => setLlm({ ...llm, llm_api_key: e.target.value })}
              />
            </Field>
            </ControlesEditables>
            {puedeEditar ? (
              <div>
                <Button type="submit" variant="accent" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar proveedor"}
                </Button>
              </div>
            ) : (
              <AvisoSoloLectura />
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas corridas de evals</CardTitle>
        </CardHeader>
        <CardContent>
          {advanced.eval_runs.length === 0 ? (
            <p className="text-sm text-text-soft">Sin corridas registradas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-soft text-sm">
              {advanced.eval_runs.map((run) => (
                <li key={run.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs text-text-soft">{run.id.slice(0, 8)}</span>
                  <span className="flex items-center gap-2">
                    {run.score !== null && <span className="text-body">{run.score}</span>}
                    <Badge variant={run.status === "passed" ? "success" : "neutral"}>
                      {run.status || "—"}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
