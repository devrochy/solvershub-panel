"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { BotonCopiar } from "@/components/domain/boton-copiar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  const [guardado, setGuardado] = useState({
    enabled: webChat.enabled,
    originsText: webChat.allowed_origins.join("\n"),
    turnstileSiteKey: webChat.turnstile_site_key || "",
  });
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(webChat.turnstile_site_key || "");
  const [turnstileConfigured, setTurnstileConfigured] = useState(webChat.turnstile_configured);
  const [turnstile, setTurnstile] = useState("");
  const [quitarTurnstile, setQuitarTurnstile] = useState(false);
  const [rotateKey, setRotateKey] = useState(false);
  const [avanzado, setAvanzado] = useState(false);
  const [snippet, setSnippet] = useState(webChat.snippet);
  const { run, pending } = useAction();
  useAvisarCambios(
    "chat-web",
    enabled !== guardado.enabled ||
      originsText !== guardado.originsText ||
      turnstileSiteKey !== guardado.turnstileSiteKey ||
      turnstile.trim() !== "" ||
      quitarTurnstile ||
      rotateKey,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const allowed_origins = originsText
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter(Boolean);
    const siteKey = turnstileSiteKey.trim();
    // undefined = no tocar. Solo se manda si cambió (o si se quita la protección): así un
    // negocio con una configuración vieja puede guardar otros cambios sin tocar Turnstile.
    let turnstile_site_key: string | undefined;
    if (quitarTurnstile) turnstile_site_key = "";
    else if (siteKey !== guardado.turnstileSiteKey) turnstile_site_key = siteKey;
    const turnstile_secret = quitarTurnstile ? "" : turnstile.trim() || undefined;
    await run(async () => {
      const res = await fetch("/api/settings/web-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          allowed_origins,
          turnstile_site_key,
          // La secret key solo se manda si el usuario escribe una nueva.
          turnstile_secret,
          rotate_key: rotateKey,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<WebChatSettings> & { error?: string; code?: string };
      // Prender el chat web es un alta de conexión: con el tope del plan lleno, el toast ofrece mejorarlo (HU-BILL-19).
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el chat web.", code: json.code };
      const siteKeyGuardada = json.turnstile_site_key ?? (quitarTurnstile ? "" : turnstileSiteKey.trim());
      setGuardado({ enabled, originsText, turnstileSiteKey: siteKeyGuardada });
      setTurnstileSiteKey(siteKeyGuardada);
      setTurnstileConfigured(Boolean(json.turnstile_configured));
      setSnippet(json.snippet ?? "");
      setRotateKey(false);
      setTurnstile("");
      setQuitarTurnstile(false);
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
              <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-headline">Protección contra bots (Turnstile)</p>
                  <p className="text-xs text-text-soft">
                    Crea un widget de Turnstile en Cloudflare para el sitio donde vive el chat y pega sus dos claves. El chat pedirá la verificación antes de enviar.
                  </p>
                </div>
                <Field
                  label="Site key (pública)"
                  htmlFor="turnstile_site_key"
                  help="Cloudflare → Turnstile → tu widget → Site key. Se puede mostrar; no es secreta."
                >
                  <Input
                    id="turnstile_site_key"
                    value={turnstileSiteKey}
                    onChange={(e) => setTurnstileSiteKey(e.target.value)}
                    placeholder="0x4AAAAAAA…"
                    autoComplete="off"
                    disabled={quitarTurnstile}
                  />
                </Field>
                <Field
                  label="Secret key (privada)"
                  htmlFor="turnstile_secret"
                  help={
                    turnstileConfigured
                      ? "Ya está configurada. Escribe una nueva solo si quieres cambiarla."
                      : "La secret key del mismo widget. No se vuelve a mostrar después de guardar."
                  }
                >
                  <InputPassword
                    etiqueta="clave secreta"
                    id="turnstile_secret"
                    value={turnstile}
                    onChange={(e) => setTurnstile(e.target.value)}
                    autoComplete="off"
                    disabled={quitarTurnstile}
                  />
                </Field>
                {turnstileConfigured || turnstileSiteKey ? (
                  <Checkbox
                    id="quitar-turnstile"
                    label="Quitar la protección anti-bots"
                    checked={quitarTurnstile}
                    onCheckedChange={setQuitarTurnstile}
                  />
                ) : null}
                {quitarTurnstile ? (
                  <p className="text-xs text-text-soft">
                    Al guardar se borran la site key y la secret key; el chat dejará de pedir verificación.
                  </p>
                ) : null}
              </div>
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
