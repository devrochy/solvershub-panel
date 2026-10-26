"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Advanced = {
  versions: { id: string; version: string; is_active: boolean; created_at: string | null }[];
  llm: { llm_provider: string; llm_model: string; has_api_key: boolean };
  guardrails_text: string;
  flow: { source: string; sections: { label: string; purpose: string | null; tools: string[] }[]; unknown_tools: string[] };
  eval_runs: { id: string; status: string; score: number | null; created_at: string | null }[];
  spec: Record<string, unknown>;
};

/** Configuración avanzada: versiones, LLM, guardrails, flow y evals. */
export function AdvancedPanel({ advanced }: { advanced: Advanced }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [llm, setLlm] = useState({ ...advanced.llm, llm_api_key: "" });
  const [guardrails, setGuardrails] = useState(advanced.guardrails_text);
  const [spec, setSpec] = useState(() => JSON.stringify(advanced.spec ?? {}, null, 2));
  const [status, setStatus] = useState<{
    loading?: string;
    error?: string;
    success?: string;
    /** Líneas del DSL de guardrails que el backend ignoró (DEF-01). */
    ignored?: string[];
  }>({});

  async function post(payload: Record<string, unknown>, ok: string) {
    setStatus({ loading: String(payload.action) });
    const res = await fetch("/api/settings/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; ignored?: string[] };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    setStatus({ success: ok, ignored: json.ignored?.length ? json.ignored : undefined });
    router.refresh();
  }

  function onLlm(event: FormEvent) {
    event.preventDefault();
    void post({ action: "llm", ...llm }, "LLM actualizado.");
  }

  function onGuardrails(event: FormEvent) {
    event.preventDefault();
    void post({ action: "guardrails", guardrails_text: guardrails }, "Guardrails guardados.");
  }

  function onSpec(event: FormEvent) {
    event.preventDefault();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(spec) as Record<string, unknown>;
    } catch {
      setStatus({ error: "El spec no es JSON válido." });
      return;
    }
    void post({ action: "spec", spec: parsed }, "AgentSpec guardado (se crea versión solo si cambió).");
  }

  return (
    <div className="flex flex-col gap-5">
      <FormFeedback error={status.error} success={status.success} />

      {status.ignored && (
        <div role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4">
          <p className="text-sm font-medium text-headline">
            Se ignoraron {status.ignored.length} línea(s) de guardrails (el resto sí se guardó):
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-body">
            {status.ignored.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Editor crudo del AgentSpec</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSpec} className="flex flex-col gap-4">
            <p className="text-xs text-text-soft">
              Si completás este JSON y guardás, <strong>reemplaza todo el formulario</strong> de
              Configuración y crea una versión nueva del AgentSpec. Las versiones anteriores quedan
              como históricas.
            </p>
            <Textarea
              aria-label="AgentSpec (JSON)"
              className="min-h-96 font-mono text-xs"
              onChange={(e) => setSpec(e.target.value)}
              value={spec}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status.loading === "spec"}>
                {status.loading === "spec" ? "Guardando…" : "Guardar AgentSpec"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-body">
        Las herramientas declarativas (JSON) siguen en el panel clásico:{" "}
        <Link href="/legacy/admin/configuracion?tab=avanzado" className="text-link hover:underline">
          abrir Avanzado clásico ↗
        </Link>
        .
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Versiones del agente</CardTitle>
        </CardHeader>
        <CardContent>
          {advanced.versions.length === 0 ? (
            <p className="text-sm text-text-soft">Sin versiones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Versión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advanced.versions.slice(0, 10).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.version}</TableCell>
                    <TableCell>
                      {v.is_active ? (
                        <Badge variant="success">activa</Badge>
                      ) : (
                        <Badge variant="neutral">histórica</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!v.is_active && (
                        <Button
                          onClick={() => {
                            void (async () => {
                              const aceptado = await confirm({
                                title: "Activar versión",
                                description: `Se activará la versión ${v.version}, que reemplaza a la versión activa actual.`,
                                confirmLabel: "Activar",
                                destructive: true,
                              });
                              if (!aceptado) return;
                              void post(
                                { action: "activate-version", record_id: v.id },
                                `Versión ${v.version} activada.`,
                              );
                            })();
                          }}
                          disabled={Boolean(status.loading)}
                          aria-label="Activar"
                          size="icon"
                        >
                          <Check className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proveedor LLM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onLlm} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Proveedor" htmlFor="llm_provider">
                <Input
                  id="llm_provider"
                  value={llm.llm_provider}
                  onChange={(e) => setLlm({ ...llm, llm_provider: e.target.value })}
                />
              </Field>
              <Field label="Modelo" htmlFor="llm_model">
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
            <div>
              <Button type="submit" variant="accent" disabled={Boolean(status.loading)}>
                Guardar LLM
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardrails personalizados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onGuardrails} className="flex flex-col gap-4">
            <Field
              label="Reglas (una por línea)"
              htmlFor="guardrails_text"
              help="forbidden_phrase | frase1, frase2 | retry · required_tool | frases | tool | escalate · max_length | 500 | retry"
            >
              <Textarea
                id="guardrails_text"
                rows={5}
                value={guardrails}
                onChange={(e) => setGuardrails(e.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" variant="accent" disabled={Boolean(status.loading)}>
                Guardar guardrails
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flow de atención</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-xs text-text-soft">Origen: {advanced.flow.source || "—"}</p>
          {advanced.flow.sections.length === 0 ? (
            <p className="text-sm text-text-soft">Sin secciones definidas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-soft">
              {advanced.flow.sections.map((section) => (
                <li key={section.label} className="flex flex-col gap-1 py-2">
                  <span className="text-sm text-headline">{section.label}</span>
                  {section.purpose && <span className="text-xs text-text-soft">{section.purpose}</span>}
                  <span className="font-mono text-xs text-body">{section.tools.join(", ") || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          {advanced.flow.unknown_tools.length > 0 && (
            <p className="text-xs text-status-warning-fg">
              Herramientas desconocidas: {advanced.flow.unknown_tools.join(", ")}
            </p>
          )}
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
