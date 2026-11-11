"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { opcionesDeHora } from "@/lib/calendario/formulario";
import type { Franja } from "@/lib/horario-atencion";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const POR_DEFECTO = { from: "09:00", to: "18:00" };

/**
 * Horario de atención por días (CFG-01): un interruptor por día y sus horas para elegir, en formato de
 * Colombia. Un día puede tener varias franjas (mañana y tarde). Los días van con el índice del backend
 * (0 = lunes … 6 = domingo, ver `lib/horario-atencion.ts`).
 */
export function EditorDeFranjas({
  id,
  franjas,
  onChange,
  disabled,
}: {
  id: string;
  franjas: Franja[];
  onChange: (franjas: Franja[]) => void;
  disabled?: boolean;
}) {
  const delDia = (dia: number) => franjas.map((f, i) => ({ ...f, i })).filter((f) => f.day === dia);

  function encender(dia: number, abierto: boolean) {
    onChange(abierto ? [...franjas, { day: dia, ...POR_DEFECTO }] : franjas.filter((f) => f.day !== dia));
  }

  function cambiar(i: number, cambio: Partial<Franja>) {
    onChange(franjas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  }

  function copiarLunes() {
    const lunes = franjas.filter((f) => f.day === 0);
    onChange([...lunes, ...[1, 2, 3, 4, 5, 6].flatMap((dia) => lunes.map((f) => ({ ...f, day: dia })))]);
  }

  return (
    <div id={id} className="flex flex-col">
      {DIAS.map((nombre, dia) => {
        const lista = delDia(dia);
        const abierto = lista.length > 0;
        return (
          <div key={nombre} className="grid grid-cols-[6.5rem_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-border-soft py-2.5 first:border-t-0">
            <span className="pt-2 text-sm text-headline">{nombre}</span>
            <span className="pt-1.5">
              <Switch
                checked={abierto}
                disabled={disabled}
                onCheckedChange={(v) => encender(dia, v)}
                aria-label={`Abierto el ${nombre.toLowerCase()}`}
              />
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              {!abierto && <span className="pt-2 text-sm text-text-soft">Cerrado</span>}
              {lista.map((f, k) => {
                const alReves = f.from >= f.to;
                return (
                  <div key={f.i} className="flex flex-wrap items-center gap-2">
                    <Select
                      aria-label={`${nombre}: desde`}
                      value={f.from}
                      disabled={disabled}
                      className="w-36"
                      onChange={(e) => cambiar(f.i, { from: e.target.value })}
                    >
                      {opcionesDeHora(30, 0, 23, f.from).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    <span className="text-sm text-text-soft">a</span>
                    <Select
                      aria-label={`${nombre}: hasta`}
                      value={f.to}
                      disabled={disabled}
                      className="w-36"
                      onChange={(e) => cambiar(f.i, { to: e.target.value })}
                    >
                      {opcionesDeHora(30, 0, 23, f.to).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    {k > 0 && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar la franja ${k + 1} del ${nombre.toLowerCase()}`}
                        onClick={() => onChange(franjas.filter((_, j) => j !== f.i))}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                    {alReves && <span className="w-full text-xs text-status-warning-fg">La hora de cierre tiene que ser después de la de apertura.</span>}
                  </div>
                );
              })}
              {abierto && !disabled && (
                <button
                  type="button"
                  onClick={() => onChange([...franjas, { day: dia, from: "14:00", to: "18:00" }])}
                  className="inline-flex items-center gap-1 self-start text-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Otra franja el {nombre.toLowerCase()}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {!disabled && franjas.some((f) => f.day === 0) && (
        <Button type="button" variant="ghost" size="sm" className="mt-2 self-start" onClick={copiarLunes}>
          Copiar el lunes a los demás días
        </Button>
      )}
    </div>
  );
}
