"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Renderer de formularios desde JSON Schema v2 (HU-FWK-08).
 *
 * Soporta:
 *   - `anyOf` con `null` → campo opcional (nullable).
 *   - `array` de strings → lista de una por línea.
 *   - `object` → JSON en un textarea, validado al enviar.
 *   - `enum` (+ `x-enumLabels`) → select con etiqueta legible.
 *   - `format: textarea` → textarea.
 *   - `x-widget` → fuerza el control (`textarea` | `list` | `json`).
 *   - `x-group` → agrupa campos bajo un encabezado.
 *   - Errores por campo del backend (`error.fields`).
 */
type JsonSchema = {
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  writeOnly?: boolean;
  anyOf?: JsonSchema[];
  items?: JsonSchema;
  "x-enumLabels"?: string[] | Record<string, string>;
  "x-widget"?: string;
  "x-group"?: string;
};

function humanize(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const isSecret = (prop: JsonSchema) => Boolean(prop.writeOnly) || prop.format === "password";

/** Desenvuelve `anyOf`/`oneOf` con `null` en un tipo efectivo + `nullable`. */
export function effType(prop: JsonSchema): { type: string; nullable: boolean; source: JsonSchema } {
  if (prop.type) return { type: prop.type, nullable: false, source: prop };
  const variantes = prop.anyOf ?? [];
  const noNull = variantes.filter((v) => v.type !== "null");
  if (noNull.length === 1) {
    return { type: noNull[0].type ?? "string", nullable: true, source: { ...prop, ...noNull[0] } };
  }
  return { type: "string", nullable: false, source: prop };
}

export function enumLabels(prop: JsonSchema): Record<string, string> {
  const raw = prop["x-enumLabels"];
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {};
    (prop.enum ?? []).forEach((v, i) => (out[String(v)] = raw[i] ?? String(v)));
    return out;
  }
  return raw;
}

export function parseJsonField(value: string): { ok: true; data: unknown } | { ok: false } {
  if (!value.trim()) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

export function JsonSchemaForm({
  resourcePath,
  method = "PUT",
  extraBody,
  schema,
  initialValues,
  configuredSecrets,
  submitLabel = "Guardar",
  onSaved,
}: {
  resourcePath: string;
  method?: "PUT" | "POST";
  /** Campos adicionales del cuerpo (además de `values`). */
  extraBody?: Record<string, unknown>;
  schema: Record<string, unknown>;
  initialValues: Record<string, unknown>;
  configuredSecrets: string[];
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const root = schema as JsonSchema;
  const properties = root.properties ?? {};
  const required = new Set(root.required ?? []);

  function update(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSuccess(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function valueToText(name: string, prop: JsonSchema, tipo: string): string {
    const v = values[name];
    if (v === undefined || v === null) return "";
    if (tipo === "array") return Array.isArray(v) ? v.join("\n") : String(v);
    if (tipo === "object") return typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
    return String(v);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    // Validación local de objetos JSON antes de enviar.
    const locales: Record<string, string> = {};
    const enviados: Record<string, unknown> = { ...values };
    for (const [name, prop] of Object.entries(properties)) {
      const { type } = effType(prop);
      if (type === "object" && typeof enviados[name] === "string") {
        const parsed = parseJsonField(enviados[name] as string);
        if (parsed.ok) enviados[name] = parsed.data;
        else locales[name] = "El JSON no es válido.";
      }
    }
    if (Object.keys(locales).length > 0) {
      setFieldErrors(locales);
      setLoading(false);
      return;
    }

    const res = await fetch(resourcePath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(extraBody ?? {}), values: enviados }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; fields?: Record<string, string> } | string;
    };
    setLoading(false);
    if (!res.ok) {
      if (typeof json.error === "object" && json.error?.fields) {
        setFieldErrors(json.error.fields);
      }
      const msg = typeof json.error === "string" ? json.error : json.error?.message;
      setError(msg ?? "No se pudo guardar la configuración.");
      return;
    }
    setSuccess("Configuración guardada.");
    router.refresh();
    onSaved?.();
  }

  function renderControl(name: string, prop: JsonSchema): ReactNode {
    const { type, source, nullable } = effType(prop);
    const widget = prop["x-widget"] ?? "";
    const id = `field-${name}`;
    const labels = enumLabels(prop);
    const etiqueta = (v: unknown) => labels[String(v)] ?? String(v);

    if (type === "boolean") {
      return (
        <label htmlFor={id} className="flex items-center gap-3 text-sm text-headline">
          <input
            id={id}
            name={name}
            type="checkbox"
            className="h-4 w-4 rounded border-control-border bg-bg-deep accent-[var(--sh-blue-500)]"
            checked={Boolean(values[name])}
            onChange={(e) => update(name, e.target.checked)}
          />
          {source.title ?? humanize(name)}
        </label>
      );
    }

    if (source.enum) {
      return (
        <select
          id={id}
          name={name}
          required={required.has(name)}
          value={String(values[name] ?? "")}
          onChange={(e) => update(name, e.target.value)}
          className="h-10 w-full rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline"
        >
          {!required.has(name) && <option value="">—</option>}
          {(source.enum ?? []).map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {etiqueta(opt)}
            </option>
          ))}
        </select>
      );
    }

    if (isSecret(prop)) {
      return (
        <Input
          id={id}
          name={name}
          type="password"
          autoComplete="new-password"
          placeholder={configuredSecrets.includes(name) ? "•••••••• (guardado)" : ""}
          value={String(values[name] ?? "")}
          onChange={(e) => update(name, e.target.value)}
        />
      );
    }

    // Arrays: una entrada por línea (listas de strings).
    if (type === "array" && widget !== "json") {
      return (
        <Textarea
          id={id}
          name={name}
          rows={4}
          placeholder="Una por línea"
          value={valueToText(name, prop, "array")}
          onChange={(e) =>
            update(
              name,
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
    }

    // Objetos: JSON en textarea.
    if (type === "object" || widget === "json") {
      return (
        <Textarea
          id={id}
          name={name}
          rows={4}
          className="font-mono text-xs"
          placeholder="{ }"
          value={valueToText(name, prop, "object")}
          onChange={(e) => update(name, e.target.value)}
        />
      );
    }

    if (type === "string" && (source.format === "textarea" || widget === "textarea")) {
      return (
        <Textarea
          id={id}
          name={name}
          required={required.has(name)}
          value={String(values[name] ?? "")}
          onChange={(e) => update(name, e.target.value)}
        />
      );
    }

    const isNumber = type === "number" || type === "integer";
    return (
      <Input
        id={id}
        name={name}
        type={isNumber ? "number" : "text"}
        step={type === "integer" ? "1" : isNumber ? "any" : undefined}
        min={source.minimum}
        max={source.maximum}
        required={required.has(name) && !nullable}
        value={String(values[name] ?? "")}
        onChange={(e) =>
          update(name, isNumber ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
        }
      />
    );
  }

  // Agrupar por `x-group` respetando el orden de aparición.
  const grupos: { grupo: string | null; campos: [string, JsonSchema][] }[] = [];
  for (const [name, prop] of Object.entries(properties)) {
    const grupo = prop["x-group"] ?? null;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.grupo === grupo) ultimo.campos.push([name, prop]);
    else grupos.push({ grupo, campos: [[name, prop]] });
  }

  function renderCampo(name: string, prop: JsonSchema): ReactNode {
    const esBool = effType(prop).type === "boolean";
    const id = `field-${name}`;
    if (esBool) {
      return (
        <div key={name} className="flex flex-col gap-1.5">
          {renderControl(name, prop)}
          {fieldErrors[name] ? (
            <p role="alert" className="text-xs text-status-danger-fg">
              {fieldErrors[name]}
            </p>
          ) : (
            prop.description && <p className="text-xs text-text-soft">{prop.description}</p>
          )}
        </div>
      );
    }
    return (
      <Field
        key={name}
        label={prop.title ?? humanize(name)}
        htmlFor={id}
        help={prop.description}
        error={fieldErrors[name]}
        required={required.has(name)}
      >
        {renderControl(name, prop)}
      </Field>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {grupos.map(({ grupo, campos }, i) => (
        <fieldset key={`${grupo ?? "sin-grupo"}-${i}`} className="flex flex-col gap-4">
          {grupo && (
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-link">
              {grupo}
            </legend>
          )}
          {campos.map(([name, prop]) => renderCampo(name, prop))}
        </fieldset>
      ))}

      <FormFeedback error={error} success={success} />

      <div>
        <Button type="submit" variant="accent" disabled={loading}>
          {loading ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
