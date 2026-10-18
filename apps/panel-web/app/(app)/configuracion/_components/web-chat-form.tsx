"use client";

import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { WebChatSettings } from "@/lib/api/types";
import { useAction } from "@/lib/use-action";

/** Chat web embebible: habilita el widget, dominios permitidos y Turnstile. */
export function WebChatForm({ webChat }: { webChat: WebChatSettings }) {
  const [enabled, setEnabled] = useState(webChat.enabled);
  const [originsText, setOriginsText] = useState(webChat.allowed_origins.join("\n"));
  const [turnstile, setTurnstile] = useState("");
  const [rotateKey, setRotateKey] = useState(false);
  const [snippet, setSnippet] = useState(webChat.snippet);
  const [copied, setCopied] = useState(false);
  const { run, pending } = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const allowed_origins = originsText
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter(Boolean);
    await run(async () => {
      const res = await fetch("/api/settings/web-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          allowed_origins,
          // undefined = no tocar el secreto existente.
          turnstile_secret: turnstile.trim() === "" ? undefined : turnstile.trim(),
          rotate_key: rotateKey,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<WebChatSettings> & { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el chat web." };
      setSnippet(json.snippet ?? "");
      setRotateKey(false);
      setTurnstile("");
      return { ok: true, success: "Chat web guardado." };
    });
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-body">Chat web embebible</p>
              <p className="text-xs text-text-soft">
                Pega un fragmento en tu sitio y tus visitantes hablan con el mismo agente.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Activar chat web" />
          </div>

          <Field
            label="Dominios permitidos"
            htmlFor="allowed_origins"
            help="Uno por línea, con esquema (https://tunegocio.com). Solo estos dominios pueden incrustar el chat."
          >
            <Textarea
              id="allowed_origins"
              rows={4}
              value={originsText}
              onChange={(e) => setOriginsText(e.target.value)}
              placeholder="https://tunegocio.com"
            />
          </Field>

          <Field
            label="Secreto de Turnstile (opcional)"
            htmlFor="turnstile_secret"
            help="Deja vacío para no cambiarlo. Si lo defines, el widget exige el anti-bots de Cloudflare."
          >
            <Input
              id="turnstile_secret"
              type="password"
              value={turnstile}
              onChange={(e) => setTurnstile(e.target.value)}
              autoComplete="off"
            />
          </Field>

          {webChat.turnstile_configured ? (
            <p className="-mt-2 text-xs text-text-soft">
              <Badge variant="neutral">Turnstile configurado</Badge>
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-xs text-text-soft">
            <input
              type="checkbox"
              checked={rotateKey}
              onChange={(e) => setRotateKey(e.target.checked)}
            />
            Rotar la clave pública (el fragmento actual deja de funcionar)
          </label>


          {snippet ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-medium text-body">Fragmento para tu sitio</p>
              <Textarea readOnly rows={2} value={snippet} className="font-mono text-xs" />
              <div>
                <Button type="button" variant="outline" onClick={copySnippet}>
                  {copied ? "Copiado" : "Copiar fragmento"}
                </Button>
              </div>
            </div>
          ) : null}

          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Guardando…" : "Guardar chat web"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
