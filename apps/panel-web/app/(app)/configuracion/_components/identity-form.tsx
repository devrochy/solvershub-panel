"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { IdentitySettings } from "@/lib/api/types";
import { cuerpoIdentidad } from "@/lib/asistente";
import { formatList, parseList } from "@/lib/format";

const TONOS = ["calido", "formal", "divertido"];
const PERSONA_TONES = ["formal", "neutral", "cercano", "informal"];
const EMOJIS = ["none", "sparse", "free"];
const DEBOUNCE = ["inmediato", "rapido", "natural", "pausado"];
// Estilo de envío (HU-ARCH-11): cada mensaje de servicio lo cobra Meta.
const SPLIT_STYLES: { value: string; label: string }[] = [
  { value: "un_mensaje", label: "Un solo mensaje (1 por respuesta)" },
  { value: "pocos_cortos", label: "Pocos mensajes cortos (hasta 3)" },
  { value: "varios_cortos", label: "Varios mensajes cortos (hasta 6)" },
];
// Moneda del negocio (HU-UI-01).
const CURRENCIES: { value: string; label: string }[] = [
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
];
// Zona horaria del negocio (HU-CAL-04): de ella salen la fecha y hora que usa
// el asistente ("hoy", "mañana") y el horario de atención.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Guatemala", label: "Guatemala" },
  { value: "America/Costa_Rica", label: "Costa Rica" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Santo_Domingo", label: "República Dominicana" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { value: "America/New_York", label: "Estados Unidos (Nueva York)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
  { value: "UTC", label: "UTC" },
];
// Qué hace el asistente si agota los reintentos del guardrail (HU-CAL-04).
const GUARDRAIL_FAIL_ACTIONS: { value: IdentitySettings["guardrail_fail_action"]; label: string }[] = [
  { value: "escalate", label: "Escalar a una persona" },
  { value: "neutral", label: "Responder que va a verificar" },
];

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function rangesToText(ranges: Record<string, unknown>[]): string {
  return ranges
    .map((r) => `${r.day} ${r.from}-${r.to}`)
    .join("\n");
}

function textToRanges(text: string): { day: number; from: string; to: string }[] {
  const out: { day: number; from: string; to: string }[] = [];
  for (const line of text.split("\n")) {
    const m = /^([0-6])\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(line.trim());
    if (m) out.push({ day: Number(m[1]), from: m[2], to: m[3] });
  }
  return out;
}

/** Formulario de Identidad del agente. Responsabilidad: editar y guardar. */
export function IdentityForm({ identity }: { identity: IdentitySettings }) {
  const router = useRouter();
  const [values, setValues] = useState(identity);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  const set = <K extends keyof IdentitySettings>(key: K, value: IdentitySettings[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ loading: true });
    const res = await fetch("/api/settings/identity", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // Una sola zona en la UI: el horario de atención usa la del negocio.
      body: JSON.stringify(cuerpoIdentidad(values, identity)),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    setStatus({ success: "Identidad guardada." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre del asistente" htmlFor="assistant_name" required>
              <Input
                id="assistant_name"
                required
                value={values.assistant_name}
                onChange={(e) => set("assistant_name", e.target.value)}
              />
            </Field>
            <Field label="Tono del asistente" htmlFor="tono">
              <Select id="tono" value={values.tono} onChange={(e) => set("tono", e.target.value)}>
                {TONOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descripción del negocio" htmlFor="business_description">
            <Textarea
              id="business_description"
              rows={3}
              value={values.business_description}
              onChange={(e) => set("business_description", e.target.value)}
            />
          </Field>

          <Field label="Voz de marca" htmlFor="brand_voice" help="Opcional. Guía el estilo de las respuestas.">
            <Textarea
              id="brand_voice"
              rows={3}
              value={values.brand_voice}
              onChange={(e) => set("brand_voice", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tono de personalidad" htmlFor="persona_tone">
              <Select
                id="persona_tone"
                value={values.persona_tone}
                onChange={(e) => set("persona_tone", e.target.value)}
              >
                {PERSONA_TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Calidez (0-5)" htmlFor="persona_warmth">
              <Input
                id="persona_warmth"
                type="number"
                min={0}
                max={5}
                value={values.persona_warmth}
                onChange={(e) => set("persona_warmth", Number(e.target.value))}
              />
            </Field>
            <Field label="Emojis" htmlFor="persona_emojis">
              <Select
                id="persona_emojis"
                value={values.persona_emojis}
                onChange={(e) => set("persona_emojis", e.target.value)}
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Longitud máx. de respuesta"
              htmlFor="persona_max_length"
              help="0 = sin límite."
            >
              <Input
                id="persona_max_length"
                type="number"
                min={0}
                value={values.persona_max_length}
                onChange={(e) => set("persona_max_length", Number(e.target.value))}
              />
            </Field>
            <Field
              label="Frases prohibidas"
              htmlFor="persona_forbidden"
              help="Separadas por coma."
            >
              <Input
                id="persona_forbidden"
                value={formatList(values.persona_forbidden)}
                onChange={(e) => set("persona_forbidden", parseList(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Velocidad de respuesta"
              htmlFor="debounce_mode"
              help="Cuánto espera el asistente a que el cliente termine de escribir antes de responder."
            >
              <Select
                id="debounce_mode"
                value={values.debounce_mode}
                onChange={(e) => set("debounce_mode", e.target.value)}
              >
                {DEBOUNCE.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Estilo de envío"
              htmlFor="split_style"
              help="Cuántos mensajes envía el asistente por respuesta. Meta cobra cada mensaje de servicio: 'Un solo mensaje' gasta menos."
            >
              <Select
                id="split_style"
                value={values.split_style}
                onChange={(e) => set("split_style", e.target.value)}
              >
                {SPLIT_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Reintentos de guardrail"
              htmlFor="guardrail_max_retries"
              help="Intentos para corregir una respuesta con validación fallida o posible alucinación. Predeterminado: 1."
            >
              <Input
                id="guardrail_max_retries"
                type="number"
                min={0}
                max={5}
                value={values.guardrail_max_retries}
                onChange={(e) => set("guardrail_max_retries", Number(e.target.value))}
              />
            </Field>
            <Field
              label="Si el asistente no logra corregir su respuesta"
              htmlFor="guardrail_fail_action"
              help="Responder que va a verificar no pausa el asistente; si el cliente sigue sin solución, el escalamiento por turnos sin resolver sigue activo."
            >
              <Select
                id="guardrail_fail_action"
                value={values.guardrail_fail_action}
                onChange={(e) =>
                  set("guardrail_fail_action", e.target.value as IdentitySettings["guardrail_fail_action"])
                }
              >
                {GUARDRAIL_FAIL_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Moneda del negocio"
              htmlFor="currency"
              help="Con qué moneda se muestran los montos de comercio, cobranza y plan. Los costos de proveedor (LLM, Meta) se muestran en USD."
            >
              <Select
                id="currency"
                value={values.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Palabras que disparan escalamiento"
            htmlFor="escalation_keywords"
            help="Separadas por coma. Vacío = usa las palabras por defecto (asesor, humano, reclamo…)."
          >
            <Input
              id="escalation_keywords"
              value={formatList(values.escalation_keywords)}
              onChange={(e) => set("escalation_keywords", parseList(e.target.value))}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Zona horaria del negocio"
              htmlFor="timezone"
              help="Con esta zona el asistente sabe qué día y hora es y aplica el horario de atención."
            >
              <Select
                id="timezone"
                value={values.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              >
                {TIMEZONES.some((z) => z.value === values.timezone) ? null : (
                  <option value={values.timezone}>{values.timezone}</option>
                )}
                {TIMEZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Horario de atención"
              htmlFor="business_ranges"
              help="Una franja por línea: día (0=Dom…6=Sáb) HH:MM-HH:MM. Ej.: 1 08:00-18:00"
            >
              <Textarea
                id="business_ranges"
                rows={3}
                defaultValue={rangesToText(values.business_ranges)}
                onChange={(e) => set("business_ranges", textToRanges(e.target.value))}
              />
            </Field>
          </div>

          <p className="text-xs text-text-soft">
            Días: {DAYS.join(" · ")}
          </p>

          <Field label="Mensaje fuera de horario" htmlFor="out_of_hours_message">
            <Textarea
              id="out_of_hours_message"
              rows={2}
              value={values.out_of_hours_message}
              onChange={(e) => set("out_of_hours_message", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Mensaje largo (caracteres)" htmlFor="difficulty_long_message_threshold">
              <Input
                id="difficulty_long_message_threshold"
                type="number"
                min={50}
                max={5000}
                value={values.difficulty_long_message_threshold}
                onChange={(e) => set("difficulty_long_message_threshold", Number(e.target.value))}
              />
            </Field>
            <Field label="Turnos sin resolver" htmlFor="difficulty_turnos_sin_resolver_threshold">
              <Input
                id="difficulty_turnos_sin_resolver_threshold"
                type="number"
                min={1}
                max={20}
                value={values.difficulty_turnos_sin_resolver_threshold}
                onChange={(e) =>
                  set("difficulty_turnos_sin_resolver_threshold", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Puntaje para razonamiento" htmlFor="difficulty_score_threshold">
              <Input
                id="difficulty_score_threshold"
                type="number"
                min={1}
                max={10}
                value={values.difficulty_score_threshold}
                onChange={(e) => set("difficulty_score_threshold", Number(e.target.value))}
              />
            </Field>
          </div>

          {values.available_guardrails.length > 0 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-[13px] font-medium text-body">Guardrails activos</legend>
              <p className="text-xs text-text-soft">
                Cada interruptor controla si ese guardrail corre para este negocio (apagado = no se
                evalúa).
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {values.available_guardrails.map((guardrail) => {
                  const enabled = !values.disabled_guardrails.includes(guardrail);
                  return (
                    <label
                      key={guardrail}
                      className="flex items-center gap-2.5 text-sm text-headline"
                    >
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          set(
                            "disabled_guardrails",
                            checked
                              ? values.disabled_guardrails.filter((g) => g !== guardrail)
                              : [...values.disabled_guardrails, guardrail],
                          )
                        }
                        aria-label={`Guardrail ${guardrail}`}
                      />
                      {guardrail}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="flex flex-col gap-1 text-sm text-headline">
            <span className="flex items-center gap-3">
              <Switch
                checked={values.bot_paused}
                onCheckedChange={(checked) => set("bot_paused", checked)}
                aria-label="Pausar el asistente"
              />
              Pausar el asistente (kill-switch del negocio)
            </span>
            <span className="pl-11 text-xs text-text-soft">
              Con el asistente pausado los mensajes se siguen guardando, pero nadie responde.
            </span>
          </label>

          <FormFeedback error={status.error} success={status.success} />

          <div>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar identidad"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
