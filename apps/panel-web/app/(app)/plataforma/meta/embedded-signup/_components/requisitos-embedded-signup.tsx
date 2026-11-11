"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleHelp, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { components } from "@/lib/api/schema";
import { diaEnPalabras } from "@/lib/plataforma";
import { faltaEnPalabras, resumenRevision } from "@/lib/requisitos-embedded-signup";
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
      {/* PLT-08: lo que falta en una frase; los identificadores, en «Detalles». */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-body">
        <Badge variant={estado.ready ? "success" : "warning"}>{estado.ready ? "Lista" : "Faltan requisitos"}</Badge>
        <span>{faltaEnPalabras(estado)}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revisión del servidor</CardTitle>
          <p className="text-xs text-text-soft">Se toma de la revisión de «App de Meta» y vale 30 días.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {revision.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-fg" aria-hidden />
            ) : revision.expired || revision.pending.length > 0 ? (
              <CircleAlert className="h-4 w-4 shrink-0 text-status-danger-fg" aria-hidden />
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
          <Link className="text-xs text-link underline-offset-2 hover:underline" href="/plataforma/meta">
            {revision.expired ? "Revisar de nuevo en App de Meta" : "Ver y revisar en App de Meta"}
          </Link>
          {!revision.expired && revision.expires_at && (
            <span className="text-xs text-text-soft">Vale hasta el {diaEnPalabras(revision.expires_at)}</span>
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
                    className="inline-flex items-center gap-1 text-xs text-link underline-offset-2 hover:underline"
                  >
                    Abrir en Meta <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  {m.updated_at && (
                    <span className="text-xs text-text-soft">Confirmado el {diaEnPalabras(m.updated_at)}</span>
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

      <details className="text-sm text-text-soft">
        <summary className="cursor-pointer">Detalles</summary>
        <dl className="mt-2 grid gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-4">
          <dt>App de Meta</dt>
          <dd className="font-mono text-xs text-body">{estado.app_id || "sin configurar"}</dd>
          <dt>Configuración del registro</dt>
          <dd className="font-mono text-xs text-body">{estado.config_id || "sin configurar"}</dd>
          <dt>Versión de la API de Meta</dt>
          <dd className="font-mono text-xs text-body">{estado.graph_api_version}</dd>
        </dl>
      </details>
    </div>
  );
}
