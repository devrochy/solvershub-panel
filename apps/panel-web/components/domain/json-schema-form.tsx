"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Renderer de formularios desde JSON Schema (reemplaza al FormGenerator SSR).
 * Mismo mapeo que `core/admin/form_generator.py`:
 *   boolean → checkbox · string+enum → select · writeOnly/password → password
 *   format:textarea → textarea · integer/number → number · resto → text
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
};

function humanize(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const isSecret = (prop: JsonSchema) => Boolean(prop.writeOnly) || prop.format === "password";

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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const root = schema as JsonSchema;
  const properties = root.properties ?? {};
  const required = new Set(root.required ?? []);

  function update(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSuccess(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(resourcePath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(extraBody ?? {}), values }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    setLoading(false);
    if (!res.ok) {
      setError(json?.error?.message ?? "No se pudo guardar la configuración.");
      return;
    }
    setSuccess("Configuración guardada.");
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {Object.entries(properties).map(([name, prop]) => {
        const id = `field-${name}`;
        const label = prop.title ?? humanize(name);
        const isRequired = required.has(name);
        let control: ReactNode;

        if (prop.type === "boolean") {
          control = (
            <label htmlFor={id} className="flex items-center gap-3 text-sm text-headline">
              <input
                id={id}
                name={name}
                type="checkbox"
                className="h-4 w-4 rounded border-control-border bg-bg-deep accent-[var(--sh-blue-500)]"
                checked={Boolean(values[name])}
                onChange={(e) => update(name, e.target.checked)}
              />
              {label}
            </label>
          );
          return (
            <div key={name} className="flex flex-col gap-1.5">
              {control}
              {prop.description && (
                <p className="text-xs text-text-soft">{prop.description}</p>
              )}
            </div>
          );
        }

        if (prop.type === "string" && prop.enum) {
          control = (
            <select
              id={id}
              name={name}
              required={isRequired}
              value={String(values[name] ?? "")}
              onChange={(e) => update(name, e.target.value)}
              className="h-10 w-full rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline"
            >
              {prop.enum.map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {String(opt)}
                </option>
              ))}
            </select>
          );
        } else if (isSecret(prop)) {
          control = (
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
        } else if (prop.type === "string" && prop.format === "textarea") {
          control = (
            <Textarea
              id={id}
              name={name}
              required={isRequired}
              value={String(values[name] ?? "")}
              onChange={(e) => update(name, e.target.value)}
            />
          );
        } else {
          const isNumber = prop.type === "number" || prop.type === "integer";
          control = (
            <Input
              id={id}
              name={name}
              type={isNumber ? "number" : "text"}
              step={prop.type === "integer" ? "1" : isNumber ? "any" : undefined}
              min={prop.minimum}
              max={prop.maximum}
              required={isRequired}
              value={String(values[name] ?? "")}
              onChange={(e) => update(name, e.target.value)}
            />
          );
        }

        return (
          <Field
            key={name}
            label={label}
            htmlFor={id}
            help={prop.description}
            required={isRequired}
          >
            {control}
          </Field>
        );
      })}

      <FormFeedback error={error} success={success} />

      <div>
        <Button type="submit" variant="accent" disabled={loading}>
          {loading ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
