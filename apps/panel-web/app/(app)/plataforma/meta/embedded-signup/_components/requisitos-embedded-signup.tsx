"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleHelp, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { components } from "@/lib/api/schema";
import { formatDateTime } from "@/lib/format";
import { resumenRevision } from "@/lib/requisitos-embedded-signup";
import { useAction } from "@/lib/use-action";

type Requisitos = components["schemas"]["EmbeddedSignupRequirements"];

export function RequisitosEmbeddedSignup({ inicial }: { inicial: Requisitos }) {
  const [estado, setEstado] = useState(inicial);
  const revision = estado.platform_check;
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
          <CardTitle className="text-sm">Revisión del servidor</CardTitle>
          <p className="text-xs text-text-soft">
            Las variables de la app, el webhook en HTTPS y su suscripción se revisan en «App de Meta», junto con
            el resto de la infraestructura. La revisión vale 30 días.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {revision.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : revision.expired || revision.pending.length > 0 ? (
              <CircleAlert className="h-4 w-4 shrink-0 text-danger" aria-hidden />
            ) : (
              <CircleHelp className="h-4 w-4 shrink-0 text-text-soft" aria-hidden />
            )}
            <span className="text-body">{resumenRevision(revision)}</span>
          </div>
          {revision.pending.length > 0 && (
            <ul className="ml-6 list-disc text-xs text-text-soft">
              {revision.pending.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <Link className="text-xs text-accent underline-offset-2 hover:underline" href="/plataforma/meta">
            {revision.expired ? "Revisar de nuevo en App de Meta" : "Ver y revisar en App de Meta"}
          </Link>
          {!revision.expired && revision.expires_at && (
            <span className="text-xs text-text-soft">Vale hasta {formatDateTime(revision.expires_at)} (30 días).</span>
          )}
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
