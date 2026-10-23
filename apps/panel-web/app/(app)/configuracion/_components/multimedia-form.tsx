"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { InputPassword } from "@/components/ui/input-password";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { MediaSettings } from "@/lib/api/types";

type Capability = "audio" | "vision";

/** Configuración de multimedia: notas de voz (STT) e imágenes (visión). */
export function MultimediaForm({ media }: { media: MediaSettings }) {
  const [audio, setAudio] = useState(media.audio);
  const [vision, setVision] = useState(media.vision);
  const [audioKey, setAudioKey] = useState("");
  const [visionKey, setVisionKey] = useState("");
  const [status, setStatus] = useState<{
    loading?: string;
    error?: string;
    success?: string;
  }>({});

  const audioProvider = media.catalog.audio.find((p) => p.key === audio.provider);
  const visionProvider = media.catalog.vision.find((p) => p.key === vision.provider);
  const disponible = media.catalog.audio.length > 0 || media.catalog.vision.length > 0;

  function providerModels(capability: Capability, providerKey: string): { id: string; label: string }[] {
    const lista = media.catalog[capability].find((p) => p.key === providerKey)?.models ?? [];
    return lista;
  }

  function onAudioProvider(providerKey: string) {
    const entry = media.catalog.audio.find((p) => p.key === providerKey);
    setAudio({ ...audio, provider: providerKey, model: entry?.default_model ?? "" });
  }

  function onVisionProvider(providerKey: string) {
    const entry = media.catalog.vision.find((p) => p.key === providerKey);
    setVision({ ...vision, provider: providerKey, model: entry?.default_model ?? "" });
  }

  async function test(capability: Capability) {
    const values = capability === "audio" ? audio : vision;
    const key = capability === "audio" ? audioKey : visionKey;
    setStatus({ loading: `test-${capability}` });
    const res = await fetch("/api/settings/media/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: capability,
        provider: values.provider,
        model: values.model,
        api_key: key,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo probar la conexión." });
      return;
    }
    setStatus({ success: `Conexión de ${capability === "audio" ? "audio" : "visión"} verificada.` });
  }

  async function save(capability: Capability) {
    const values = capability === "audio" ? audio : vision;
    const key = capability === "audio" ? audioKey : visionKey;
    setStatus({ loading: `save-${capability}` });
    const res = await fetch("/api/settings/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: capability,
        enabled: values.enabled,
        provider: values.provider,
        model: values.model,
        ...(capability === "vision" ? { mode: vision.mode } : {}),
        api_key: key,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    if (capability === "audio") {
      setAudio({ ...audio, has_api_key: audio.has_api_key || Boolean(key), using_platform_key: false });
      setAudioKey("");
    } else {
      setVision({ ...vision, has_api_key: vision.has_api_key || Boolean(key), using_platform_key: false });
      setVisionKey("");
    }
    setStatus({ success: `Configuración de ${capability === "audio" ? "audio" : "visión"} guardada.` });
  }

  if (!disponible) {
    return (
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-body">
            La configuración de multimedia no está disponible en este servidor. Actualizá el
            backend y volvé a cargar la página.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FormFeedback error={status.error} success={status.success} />

      <Card>
        <CardHeader>
          <CardTitle>Notas de voz</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-headline">Transcribir notas de voz</p>
              <p className="text-xs text-text-soft">
                El cliente manda un audio y el asistente responde como si lo hubiera escrito.
              </p>
            </div>
            <Switch
              checked={audio.enabled}
              onCheckedChange={(checked) => setAudio({ ...audio, enabled: checked })}
              aria-label="Transcribir notas de voz"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Proveedor" htmlFor="audio_provider">
              <Select
                id="audio_provider"
                value={audio.provider}
                onChange={(e) => onAudioProvider(e.target.value)}
              >
                {media.catalog.audio.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Modelo" htmlFor="audio_model">
              <Select
                id="audio_model"
                value={audio.model}
                onChange={(e) => setAudio({ ...audio, model: e.target.value })}
              >
                {providerModels("audio", audio.provider).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                {audio.model &&
                  !providerModels("audio", audio.provider).some((m) => m.id === audio.model) && (
                    <option value={audio.model}>{audio.model}</option>
                  )}
              </Select>
            </Field>
          </div>

          <Field
            label="Llave de API (BYOK)"
            htmlFor="audio_api_key"
            help={
              audio.has_api_key
                ? "Ya hay una llave guardada; déjala vacía para conservarla."
                : audio.using_platform_key
                  ? "Sin llave propia se usa la de la plataforma."
                  : "Sin llave no se pueden transcribir audios."
            }
          >
            <InputPassword
              id="audio_api_key"
              autoComplete="new-password"
              placeholder={audioProvider?.key === "groq" ? "gsk_…" : "sk-…"}
              value={audioKey}
              onChange={(e) => setAudioKey(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void test("audio")}
              disabled={Boolean(status.loading)}
            >
              {status.loading === "test-audio" ? "Probando…" : "Probar conexión"}
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={() => void save("audio")}
              disabled={Boolean(status.loading)}
            >
              {status.loading === "save-audio" ? "Guardando…" : "Guardar audio"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imágenes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-headline">Interpretar imágenes</p>
              <p className="text-xs text-text-soft">
                El asistente describe la imagen y sigue la conversación como texto.
              </p>
            </div>
            <Switch
              checked={vision.enabled}
              onCheckedChange={(checked) => setVision({ ...vision, enabled: checked })}
              aria-label="Interpretar imágenes"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Proveedor" htmlFor="vision_provider">
              <Select
                id="vision_provider"
                value={vision.provider}
                onChange={(e) => onVisionProvider(e.target.value)}
                disabled={!vision.enabled}
              >
                {media.catalog.vision.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Modelo" htmlFor="vision_model">
              <Select
                id="vision_model"
                value={vision.model}
                onChange={(e) => setVision({ ...vision, model: e.target.value })}
                disabled={!vision.enabled}
              >
                {providerModels("vision", vision.provider).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                {vision.model &&
                  !providerModels("vision", vision.provider).some((m) => m.id === vision.model) && (
                    <option value={vision.model}>{vision.model}</option>
                  )}
              </Select>
            </Field>
          </div>

          <Field
            label="Modo de imagen"
            htmlFor="vision_mode"
            help="Sin descripción, el asistente solo acusa recibo y pregunta qué necesita."
          >
            <Select
              id="vision_mode"
              value={vision.mode}
              onChange={(e) => setVision({ ...vision, mode: e.target.value })}
              disabled={!vision.enabled}
            >
              <option value="describir">Describir la imagen automáticamente</option>
              <option value="sin_descripcion">No describir: solo acusar recibo</option>
            </Select>
          </Field>

          <Field
            label="Llave de API (BYOK)"
            htmlFor="vision_api_key"
            help={
              vision.has_api_key
                ? "Ya hay una llave guardada; déjala vacía para conservarla."
                : vision.using_platform_key
                  ? "Sin llave propia se usa la de la plataforma."
                  : "Sin llave no se pueden describir imágenes."
            }
          >
            <InputPassword
              id="vision_api_key"
              autoComplete="new-password"
              placeholder={visionProvider?.key === "anthropic" ? "sk-ant-…" : "sk-…"}
              value={visionKey}
              onChange={(e) => setVisionKey(e.target.value)}
              disabled={!vision.enabled}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void test("vision")}
              disabled={Boolean(status.loading) || !vision.enabled}
            >
              {status.loading === "test-vision" ? "Probando…" : "Probar conexión"}
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={() => void save("vision")}
              disabled={Boolean(status.loading)}
            >
              {status.loading === "save-vision" ? "Guardando…" : "Guardar imágenes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
