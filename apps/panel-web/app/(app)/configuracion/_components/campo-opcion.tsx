"use client";


import { EditorDeFranjas } from "@/app/(app)/configuracion/_components/editor-de-franjas";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { ListaDeFrases } from "@/components/ui/lista-de-frases";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionConfig } from "@/lib/api/types";
import { ayudaDeOpcion, dependencia, etiquetaDeValor, valoresConActual } from "@/lib/catalogo-config";
import { type Pendiente } from "@/lib/frases-pendientes";
import type { Franja } from "@/lib/horario-atencion";

/** Monedas más usadas por los negocios; una guardada que no esté se agrega a la lista (CFG-10). */
const MONEDAS = [
  { valor: "COP", etiqueta: "Peso colombiano (COP)" },
  { valor: "USD", etiqueta: "Dólar estadounidense (USD)" },
  { valor: "MXN", etiqueta: "Peso mexicano (MXN)" },
  { valor: "PEN", etiqueta: "Sol peruano (PEN)" },
  { valor: "CLP", etiqueta: "Peso chileno (CLP)" },
  { valor: "ARS", etiqueta: "Peso argentino (ARS)" },
  { valor: "EUR", etiqueta: "Euro (EUR)" },
];

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
  onPendiente,
}: {
  opcion: OpcionConfig;
  valores: Valores;
  onChange: (clave: string, valor: unknown) => void;
  error?: string;
  /** Ayuda que depende del estado actual (p. ej. el mensaje por defecto fuera de horario). */
  ayudaExtra?: string;
  /** Etiqueta de otra opción del catálogo, para el enlace «Ir a …» cuando esta depende de ella. */
  etiquetaDe?: (clave: string) => string | undefined;
  /** Texto escrito y no agregado de una lista de textos, para sumarlo al guardar. */
  onPendiente?: (pendiente: Pendiente | null) => void;
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
        <div className="flex flex-col gap-3">
          {posibles.map((posible) => {
            const activa = !apagadas.includes(posible.valor);
            return (
              <label key={posible.valor} className="flex items-start gap-2.5 text-sm text-headline">
                <Switch
                  checked={activa}
                  disabled={bloqueado}
                  onCheckedChange={(checked) =>
                    onChange(clave, checked ? apagadas.filter((g) => g !== posible.valor) : [...apagadas, posible.valor])
                  }
                  aria-label={`${opcion.etiqueta}: ${posible.etiqueta}`}
                />
                <span className="flex flex-col">
                  {posible.etiqueta}
                  {/* Qué evita esta validación (la declara el pack o el core, SPEC-37). */}
                  {posible.nota && <span className="text-xs text-text-soft">{posible.nota}</span>}
                </span>
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
      case "decimal": {
        // Un rango corto de enteros (la calidez, de 1 a 5) se elige tocando, no escribiendo (CFG-10).
        const min = opcion.minimo ?? null;
        const max = opcion.maximo ?? null;
        if (opcion.tipo === "entero" && min !== null && max !== null && max - min <= 4) {
          const puntos = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
          return (
            <SegmentedControl
              label={opcion.etiqueta}
              options={puntos.map((p) => ({ value: p, label: p }))}
              value={String(valor ?? min)}
              onChange={bloqueado ? undefined : (v) => onChange(clave, Number(v))}
              className="self-start"
            />
          );
        }
        return (
          <InputNumero
            id={clave}
            min={opcion.minimo ?? undefined}
            max={opcion.maximo ?? undefined}
            decimal={opcion.tipo === "decimal"}
            step={opcion.tipo === "decimal" ? 0.1 : 1}
            disabled={bloqueado}
            value={Number(valor ?? 0)}
            onValueChange={(n) => onChange(clave, n)}
          />
        );
      }
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
          <ListaDeFrases
            id={clave}
            frases={Array.isArray(valor) ? (valor as string[]) : []}
            onChange={(frases) => onChange(clave, frases)}
            placeholder="Escribe y pulsa Enter"
            agregarLabel="Agregar"
            minLargo={2}
            max={100}
            onPendiente={onPendiente}
            disabled={bloqueado}
            invalido={Boolean(error)}
            describedBy={error || ayuda ? `${clave}-mensaje` : undefined}
          />
        );
      case "franjas":
        return (
          <EditorDeFranjas
            id={clave}
            franjas={Array.isArray(valor) ? (valor as Franja[]) : []}
            disabled={bloqueado}
            onChange={(franjas) => onChange(clave, franjas)}
          />
        );
      default:
        if (clave === "currency") {
          const actual = String(valor ?? "");
          const lista = MONEDAS.some((m) => m.valor === actual) || !actual ? MONEDAS : [...MONEDAS, { valor: actual, etiqueta: actual }];
          return (
            <Select id={clave} value={actual} disabled={bloqueado} onChange={(e) => onChange(clave, e.target.value)}>
              {lista.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Select>
          );
        }
        return (
          <Input
            id={clave}
            disabled={bloqueado}
            value={String(valor ?? "")}
            onChange={(e) => onChange(clave, e.target.value)}
          />
        );
    }
  }
}
