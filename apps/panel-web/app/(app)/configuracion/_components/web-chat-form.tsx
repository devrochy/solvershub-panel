"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { BotonCopiar } from "@/components/domain/boton-copiar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { InputPassword } from "@/components/ui/input-password";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogoConfig, WebChatSettings } from "@/lib/api/types";
import { ayudaDelCatalogo, indexarCatalogo } from "@/lib/catalogo-config";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { useAction } from "@/lib/use-action";

/** Chat web embebible: habilita el widget, dominios permitidos y Turnstile. */
export function WebChatForm({
  webChat,
  catalogo = null,
  puedeEditar = true,
  conFragmento = true,
}: {
  webChat: WebChatSettings;
  catalogo?: CatalogoConfig | null;
  puedeEditar?: boolean;
  /** La ficha de la conexión (HU-UX-09) muestra el fragmento en su pestaña Instalación. */
  conFragmento?: boolean;
}) {
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);
  const [enabled, setEnabled] = useState(webChat.enabled);
  const [originsText, setOriginsText] = useState(webChat.allowed_origins.join("\n"));
  // Lo último guardado, para saber si hay cambios sin guardar.
  const [guardado, setGuardado] = useState({ enabled: webChat.enabled, originsText: webChat.allowed_origins.join("\n") });
  const [turnstile, setTurnstile] = useState("");
  const [rotateKey, setRotateKey] = useState(false);
  const [avanzado, setAvanzado] = useState(false);
  const [snippet, setSnippet] = useState(webChat.snippet);
  const { run, pending } = useAction();
  useAvisarCambios(
    "chat-web",
    enabled !== guardado.enabled || originsText !== guardado.originsText || turnstile.trim() !== "" || rotateKey,
  );

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
      setGuardado({ enabled, originsText });
      setSnippet(json.snippet ?? "");
      setRotateKey(false);
      setTurnstile("");
      return { ok: true, success: "Chat web guardado." };
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-headline">Mostrar el chat en mi sitio</p>
              <p className="text-xs text-text-soft">Tus visitantes hablan con el mismo agente que atiende tus otros canales.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Mostrar el chat en mi sitio" />
          </div>

          <Field
            label="Sitios donde aparece"
            htmlFor="allowed_origins"
            help={ayudaDelCatalogo(indice, "web_chat_allowed_origins", "Uno por línea, con https:// adelante. El chat solo aparece en estos sitios.")}
          >
            <Textarea
              id="allowed_origins"
              rows={4}
              value={originsText}
              onChange={(e) => setOriginsText(e.target.value)}
              placeholder="https://tunegocio.com"
            />
          </Field>

          <button
            type="button"
            aria-expanded={avanzado}
            aria-controls="chat-web-avanzado"
            onClick={() => setAvanzado((v) => !v)}
            className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            Avanzado: protección contra bots y clave del chat
            <ChevronDown aria-hidden className={`h-4 w-4 text-text-soft transition-transform duration-150 ${avanzado ? "rotate-180" : ""}`} />
          </button>
          {avanzado && (
            <div id="chat-web-avanzado" className="flex flex-col gap-4">
              <Field
                label="Protección contra bots (Turnstile de Cloudflare)"
                htmlFor="turnstile_secret"
                help={
                  webChat.turnstile_configured
                    ? "Ya está configurada. Escribe una clave nueva solo si quieres cambiarla."
                    : "Opcional. Con la clave secreta, el chat pide la verificación anti-bots de Cloudflare."
                }
              >
                <InputPassword
                  etiqueta="clave secreta"
                  id="turnstile_secret"
                  value={turnstile}
                  onChange={(e) => setTurnstile(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Checkbox
                id="rotar-clave-chat-web"
                label="Cambiar la clave del chat (el fragmento que ya pegaste deja de funcionar)"
                checked={rotateKey}
                onCheckedChange={setRotateKey}
              />
            </div>
          )}
          </ControlesEditables>

          {conFragmento && snippet ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-headline">Fragmento para tu sitio</p>
                <BotonCopiar texto={snippet} etiqueta="Copiar fragmento" />
              </div>
              <pre className="overflow-x-auto rounded-md bg-bg-deep px-3 py-3 font-mono text-xs text-body">
                <code>{snippet}</code>
              </pre>
            </div>
          ) : null}

          {puedeEditar ? (
            <div>
              <Button type="submit" variant="accent" loading={pending}>
                Guardar
              </Button>
            </div>
          ) : (
            <AvisoSoloLectura />
          )}
        </form>
      </CardContent>
    </Card>
  );
}
