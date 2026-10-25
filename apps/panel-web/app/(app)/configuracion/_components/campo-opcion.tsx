"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionConfig } from "@/lib/api/types";
import { ayudaDeOpcion, dependencia, etiquetaDeValor, valoresConActual } from "@/lib/catalogo-config";
import { formatList, parseList } from "@/lib/format";
import { franjasATexto, textoAFranjas } from "@/lib/horario-atencion";

type Valores = Record<string, unknown>;

/**
 * Un campo de Configuración pintado desde el catálogo (SPEC-37): etiqueta, ayuda, rango y
 * valores los trae la opción; aquí solo se elige el control según su tipo. Si depende de otra
 * opción que no se cumple, se muestra apagado con el motivo.
 */
export function CampoOpcion({
  opcion,
  valores,
  onChange,
  error,
  ayudaExtra,
  etiquetaDe,
}: {
  opcion: OpcionConfig;
  valores: Valores;
  onChange: (clave: string, valor: unknown) => void;
  error?: string;
  /** Ayuda que depende del estado actual (p. ej. el mensaje por defecto fuera de horario). */
  ayudaExtra?: string;
  /** Etiqueta de otra opción del catálogo, para el enlace «Ir a …» cuando esta depende de ella. */
  etiquetaDe?: (clave: string) => string | undefined;
}) {
  const { clave } = opcion;
  const valor = valores[clave];
  const dep = dependencia(opcion, valores);
  const bloqueado = opcion.solo_lectura || !dep.activa;
  const ayuda = dep.activa ? (ayudaExtra ?? ayudaDeOpcion(opcion)) : dep.motivo;
  const enlace = !dep.activa && dep.de ? (
    <a href={`#${dep.de}`} className="underline underline-offset-2">
      Ir a «{etiquetaDe?.(dep.de) ?? dep.de}»
    </a>
  ) : null;

  if (opcion.tipo === "booleano") {
    return (
      <label className="flex flex-col gap-1 text-sm text-headline">
        <span className="flex items-center gap-3">
          <Switch
            checked={valor === true}
            disabled={bloqueado}
            onCheckedChange={(checked) => onChange(clave, checked)}
            aria-label={opcion.etiqueta}
          />
          {opcion.etiqueta}
        </span>
        <span className="pl-11 text-xs text-text-soft">
          {error ?? ayuda}
          {enlace}
        </span>
      </label>
    );
  }

  if (opcion.tipo === "elegir_varias") {
    const apagadas = Array.isArray(valor) ? (valor as string[]) : [];
    const posibles = opcion.valores ?? [];
    if (posibles.length === 0) return null;
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="text-[13px] font-medium text-body">{opcion.etiqueta}</legend>
        <p className="text-xs text-text-soft">
          {ayuda}
          {enlace}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {posibles.map((posible) => {
            const activa = !apagadas.includes(posible.valor);
            return (
              <label key={posible.valor} className="flex items-center gap-2.5 text-sm text-headline">
                <Switch
                  checked={activa}
                  disabled={bloqueado}
                  onCheckedChange={(checked) =>
                    onChange(clave, checked ? apagadas.filter((g) => g !== posible.valor) : [...apagadas, posible.valor])
                  }
                  aria-label={`${opcion.etiqueta}: ${posible.etiqueta}`}
                />
                {posible.etiqueta}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <>
      <Field label={opcion.etiqueta} htmlFor={clave} help={ayuda} error={error}>
        {control()}
      </Field>
      {enlace && <p className="mt-1 text-xs text-text-soft">{enlace}</p>}
    </>
  );

  function control() {
    switch (opcion.tipo) {
      case "elegir_una": {
        const actual = String(valor ?? "");
        return (
          <Select id={clave} value={actual} disabled={bloqueado} onChange={(e) => onChange(clave, e.target.value)}>
            {valoresConActual(opcion, actual).map((v) => (
              <option key={v.valor} value={v.valor}>
                {etiquetaDeValor(v)}
              </option>
            ))}
          </Select>
        );
      }
      case "entero":
      case "decimal":
        return (
          <Input
            id={clave}
            type="number"
            min={opcion.minimo ?? undefined}
            max={opcion.maximo ?? undefined}
            step={opcion.tipo === "decimal" ? "any" : 1}
            disabled={bloqueado}
            value={Number(valor ?? 0)}
            onChange={(e) => onChange(clave, Number(e.target.value))}
          />
        );
      case "texto_largo":
        return (
          <Textarea
            id={clave}
            rows={3}
            disabled={bloqueado}
            value={String(valor ?? "")}
            onChange={(e) => onChange(clave, e.target.value)}
          />
        );
      case "lista_de_textos":
        return (
          <Input
            id={clave}
            disabled={bloqueado}
            value={formatList(Array.isArray(valor) ? (valor as string[]) : [])}
            onChange={(e) => onChange(clave, parseList(e.target.value))}
          />
        );
      case "franjas":
        return (
          <Textarea
            id={clave}
            rows={3}
            disabled={bloqueado}
            defaultValue={franjasATexto((valor as Parameters<typeof franjasATexto>[0]) ?? [])}
            onChange={(e) => onChange(clave, textoAFranjas(e.target.value))}
          />
        );
      default:
        return (
          <Input
            id={clave}
            disabled={bloqueado}
            required={clave === "assistant_name"}
            value={String(valor ?? "")}
            onChange={(e) => onChange(clave, e.target.value)}
          />
        );
    }
  }
}
