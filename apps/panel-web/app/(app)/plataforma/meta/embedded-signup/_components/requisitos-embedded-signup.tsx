"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { components } from "@/lib/api/schema";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";

type Requisitos = components["schemas"]["EmbeddedSignupRequirements"];

export function RequisitosEmbeddedSignup({ inicial }: { inicial: Requisitos }) {
  const [estado, setEstado] = useState(inicial);
  const { run, pending } = useAction({ refresh: false });

  async function marcar(key: string, done: boolean) {
    const previo = estado;
    setEstado({ ...estado, manual: estado.manual.map((m) => (m.key === key ? { ...m, done } : m)) });
    const ok = await run(async () => {
      const res = await fetch("/api/platform/meta-app/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, done }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, error: json.error ?? "No se pudo guardar.", success: done ? "Requisito confirmado." : "Requisito desmarcado." };
    });
    if (!ok) {
      setEstado(previo);
      return;
    }
    const res = await fetch("/api/platform/meta-app/embedded-signup");
    if (res.ok) setEstado((await res.json()) as Requisitos);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-body">
        <Badge variant={estado.ready ? "success" : "warning"}>{estado.ready ? "Lista" : "Faltan requisitos"}</Badge>
        <span>
          App: <span className="font-mono text-xs">{estado.app_id || "sin configurar"}</span>
        </span>
        <span>
          config_id: <span className="font-mono text-xs">{estado.config_id || "sin configurar"}</span>
        </span>
        <span>Graph {estado.graph_api_version}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuración del servidor</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {estado.automatic.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                {c.ok === true ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="bien" />
                ) : c.ok === false ? (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="falla" />
                ) : (
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-text-soft" aria-label="sin dato" />
                )}
                <span className="flex flex-col">
                  <span className="text-body">{c.label}</span>
                  <span className="text-xs text-text-soft">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Aprobaciones de Meta</CardTitle>
          <p className="text-xs text-text-soft">Se confirman a mano con el enlace a cada pantalla de Meta.</p>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border-soft">
            {estado.manual.map((m) => (
              <li key={m.key} className="flex items-start justify-between gap-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-headline">{m.label}</span>
                  <span className="text-xs text-body">{m.help}</span>
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Abrir en Meta <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  {m.updated_at && (
                    <span className="text-xs text-text-soft">Actualizado {formatDateTime(m.updated_at)}</span>
                  )}
                </span>
                <Switch
                  checked={m.done}
                  disabled={pending}
                  aria-label={`${m.label}: ${m.done ? "confirmado" : "pendiente"}`}
                  onCheckedChange={(v: boolean) => void marcar(m.key, v)}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
