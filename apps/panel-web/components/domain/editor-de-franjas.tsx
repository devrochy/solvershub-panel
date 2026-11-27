"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { etiquetaDeHora, opcionesDeHora } from "@/lib/calendario/formulario";
import { DIAS_FRANJA, erroresDeFranjas, type Franja } from "@/lib/horario-atencion";
import { cn } from "@/lib/utils";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** Semana inicial al salir de «Atiende siempre»: lunes a viernes 8–18, sábado 8–13. */
const SEMANA_POR_DEFECTO: Franja[] = [
  ...[0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })),
  { day: 5, from: "08:00", to: "13:00" },
];

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function aHHMM(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** Suma minutos a una hora; `null` si se pasa de las 23:59. */
function sumar(hhmm: string, minutos: number): string | null {
  const base = aMinutos(hhmm);
  if (base === null) return null;
  const total = base + minutos;
  return total < 24 * 60 ? aHHMM(total) : null;
}

function diasLegibles(dias: number[]): string {
  if (dias.length === 7) return "Todos los días";
  const tramos: number[][] = [];
  for (const dia of dias) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && dia === ultimo[ultimo.length - 1] + 1) ultimo.push(dia);
    else tramos.push([dia]);
  }
  return tramos
    .map((t) =>
      t.length === 1
        ? DIAS_FRANJA[t[0]]
        : t.length === 2
          ? `${DIAS_FRANJA[t[0]]} y ${DIAS_FRANJA[t[1]]}`
          : `${DIAS_FRANJA[t[0]]} a ${DIAS_FRANJA[t[t.length - 1]]}`,
    )
    .join(", ");
}

function resumenSemana(franjas: Franja[], errorPorDia: Map<number, string>): string {
  if (franjas.length === 0) return "Siempre abierto, sin horario.";

  const grupos: { clave: string; dias: number[]; franjas: Franja[] }[] = [];
  for (let day = 0; day < 7; day++) {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const clave = errorPorDia.has(day)
      ? "error"
      : delDia.length
        ? delDia.map((f) => `${f.from}-${f.to}`).join("|")
        : "cerrado";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.dias.push(day);
    else grupos.push({ clave, dias: [day], franjas: delDia });
  }

  return grupos
    .map(({ clave, dias, franjas: delGrupo }) => {
      if (clave === "error") return `${diasLegibles(dias)}, revisar`;
      if (clave === "cerrado") return `${dias.length === 7 ? "Todos los días" : diasLegibles(dias)} cerrado`;
      const horas = delGrupo.map((f) => `${etiquetaDeHora(f.from)} – ${etiquetaDeHora(f.to)}`).join(" y ");
      return `${diasLegibles(dias)}, ${horas}`;
    })
    .join(" · ");
}

function resumenDia(franjas: Franja[], error?: string): string {
  if (!franjas.length) return "Cerrado";
  if (error) return "Revisa el horario";
  return franjas.map((f) => `${etiquetaDeHora(f.from)} – ${etiquetaDeHora(f.to)}`).join(", ");
}

function horasSemana(franjas: Franja[]): string {
  const minutos = franjas.reduce((total, f) => {
    const desde = aMinutos(f.from) ?? 0;
    const hasta = aMinutos(f.to) ?? 0;
    return total + Math.max(0, hasta - desde);
  }, 0);
  const horas = minutos / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(1)} h`;
}

function Interruptor({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
      <span
        className={cn(
          "relative h-5 w-9 rounded-pill border transition-colors duration-150",
          checked ? "border-focus bg-focus/25" : "border-control-border bg-bg-deep",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
        )}
      >
        <span
          className={cn(
            "absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-150",
            checked ? "translate-x-[18px] bg-focus" : "bg-text-soft",
          )}
        />
      </span>
    </label>
  );
}

/**
 * Horario de atención minimalista (CFG-01): la semana es una lista de siete días y solo el día
 * abierto muestra los selectores de hora. El resumen y la barra de 24 h se actualizan al instante.
 * Los índices son los del backend (0 = lunes).
 */
export function HorarioSemanal({
  id,
  franjas,
  onChange,
  modoInformativo = false,
  disabled = false,
}: {
  id: string;
  franjas: Franja[];
  onChange: (franjas: Franja[]) => void;
  /** `business_hours_mode=informativo`: el asistente atiende siempre y el horario solo se informa. */
  modoInformativo?: boolean;
  disabled?: boolean;
}) {
  const errores = useMemo(() => erroresDeFranjas(franjas), [franjas]);
  const [diaAbierto, setDiaAbierto] = useState<number | null>(() => errores[0]?.day ?? null);
  const [copiaAnterior, setCopiaAnterior] = useState<Franja[] | null>(null);
  const ultimas = useRef<Franja[]>(SEMANA_POR_DEFECTO);

  const errorPorDia = useMemo(() => new Map(errores.map((error) => [error.day, error.message])), [errores]);
  const siempre = franjas.length === 0;
  const diasAbiertos = new Set(franjas.map((f) => f.day)).size;

  function actualizar(nuevas: Franja[]) {
    setCopiaAnterior(null);
    onChange(nuevas);
  }

  function setSiempre(abierto: boolean) {
    if (abierto) {
      if (franjas.length) ultimas.current = franjas;
      onChange([]);
      setDiaAbierto(null);
      setCopiaAnterior(null);
      return;
    }
    onChange(ultimas.current.length ? ultimas.current : SEMANA_POR_DEFECTO);
  }

  function abrirDia(day: number, abierto: boolean) {
    if (abierto) {
      actualizar([...franjas, { day, from: "08:00", to: "18:00" }]);
      setDiaAbierto(day);
      return;
    }
    if (!modoInformativo && diasAbiertos <= 1) return;
    actualizar(franjas.filter((f) => f.day !== day));
    if (diaAbierto === day) setDiaAbierto(null);
  }

  function cambiarFranja(indice: number, cambio: Partial<Franja>) {
    actualizar(franjas.map((f, i) => (i === indice ? { ...f, ...cambio } : f)));
  }

  function quitarFranja(indice: number) {
    actualizar(franjas.filter((_, i) => i !== indice));
  }

  function puedeAgregar(day: number): boolean {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const ultima = delDia[delDia.length - 1];
    if (!ultima) return false;
    const inicio = sumar(ultima.to, (aMinutos(ultima.to) ?? 0) < 13 * 60 ? 120 : 60);
    return inicio !== null && (aMinutos(inicio) ?? 0) < 23 * 60;
  }

  function agregarFranja(day: number) {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const ultima = delDia[delDia.length - 1];
    if (!ultima) return;
    const inicio = sumar(ultima.to, (aMinutos(ultima.to) ?? 0) < 13 * 60 ? 120 : 60);
    if (!inicio || (aMinutos(inicio) ?? 0) >= 23 * 60) return;
    const fin = sumar(inicio, 4 * 60) ?? "23:30";
    actualizar([...franjas, { day, from: inicio, to: fin }]);
  }

  function copiarLunes() {
    const lunes = franjas.filter((f) => f.day === 0);
    if (!lunes.length) return;
    const antes = franjas;
    const resto = franjas.filter((f) => f.day < 1 || f.day > 4);
    const nuevas = [...resto, ...[1, 2, 3, 4].flatMap((day) => lunes.map((f) => ({ ...f, day })))];
    setCopiaAnterior(antes);
    onChange(nuevas);
  }

  function deshacerCopia() {
    if (!copiaAnterior) return;
    onChange(copiaAnterior);
    setCopiaAnterior(null);
  }

  const resumen = siempre && modoInformativo ? "Sin horario para informar." : resumenSemana(franjas, errorPorDia);

  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-soft">Así queda tu semana</p>
        {modoInformativo ? (
          <span className="text-xs text-text-soft">El asistente responde siempre</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <label htmlFor={`${id}-siempre`} className="cursor-pointer text-xs font-medium text-body">
              Atiende siempre
            </label>
            <Interruptor
              id={`${id}-siempre`}
              checked={siempre}
              onChange={setSiempre}
              label="Atiende siempre"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-pretty text-sm leading-5 text-headline" aria-live="polite">
          {resumen}
        </p>
        {!siempre && <span className="font-mono text-xs text-text-soft">{horasSemana(franjas)}</span>}
      </div>

      {siempre ? (
        modoInformativo ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-soft bg-surface-2 px-3 py-2">
            <p className="text-xs text-text-soft">
              El asistente responde siempre. No hay horario para informar a tus clientes.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-2 text-xs sm:h-9"
              disabled={disabled}
              onClick={() => onChange(SEMANA_POR_DEFECTO)}
            >
              Definir horario
            </Button>
          </div>
        ) : (
          <p className="rounded-md border border-border-soft bg-surface-2 px-3 py-2 text-xs text-text-soft">
            El asistente responde a toda hora. Para definir franjas, apaga «Atiende siempre».
          </p>
        )
      ) : (
        <>
          {modoInformativo && (
            <p className="text-xs text-text-soft">
              El asistente responde siempre; este horario se usa para informar a tus clientes.
            </p>
          )}
          <div className="rounded-md border border-border-soft bg-bg-deep px-2.5 pb-1.5 pt-2" aria-hidden="true">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
              <span />
              <div className="flex justify-between font-mono text-[9px] leading-none text-text-soft">
                <span>0</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
              </div>
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {DIAS.map((nombre, day) => {
                const delDia = franjas.filter((f) => f.day === day);
                const error = errorPorDia.get(day);
                return (
                  <div key={day} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-2">
                    <span className="text-[10px] font-semibold text-text-soft">{DIAS_FRANJA[day]}</span>
                    <div className="relative h-2.5 overflow-hidden rounded-sm bg-surface-2">
                      {error ? (
                        <span className="absolute inset-0 flex items-center border border-status-danger-border bg-status-danger-bg pl-1.5 text-[8px] font-semibold text-status-danger-fg">
                          Revisa
                        </span>
                      ) : delDia.length === 0 ? (
                        <span className="absolute inset-0 flex items-center pl-1.5 text-[8px] text-text-soft">
                          Cerrado
                        </span>
                      ) : (
                        delDia.map((f, i) => {
                          const desde = aMinutos(f.from) ?? 0;
                          const hasta = aMinutos(f.to) ?? desde;
                          return (
                            <span
                              key={`${nombre}-${i}`}
                              className="absolute inset-y-0.5 rounded-[2px] border border-focus bg-focus/25"
                              style={{
                                left: `${(desde / (24 * 60)) * 100}%`,
                                width: `${Math.max(0.5, ((hasta - desde) / (24 * 60)) * 100)}%`,
                              }}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {DIAS.map((nombre, day) => {
              const delDia = franjas
                .map((f, i) => ({ ...f, i }))
                .filter((f) => f.day === day)
                .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
              const abierto = delDia.length > 0;
              const error = errorPorDia.get(day);
              const texto = resumenDia(delDia, error);
              const ultimoAbierto = !modoInformativo && abierto && diasAbiertos === 1;
              return (
                <li
                  key={day}
                  className={cn(
                    "transition-colors",
                    abierto && "hover:bg-hover",
                    abierto && diaAbierto === day && "bg-surface-2",
                  )}
                >
                  <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_44px] items-center">
                    {abierto ? (
                      <button
                        type="button"
                        className="grid min-h-11 grid-cols-[5.5rem_minmax(0,1fr)_1.25rem] items-center gap-1.5 px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled}
                        aria-expanded={diaAbierto === day}
                        aria-controls={`${id}-dia-${day}`}
                        aria-label={`${nombre}: ${texto}; Editar el horario`}
                        onClick={() => setDiaAbierto(diaAbierto === day ? null : day)}
                      >
                        <span className="text-sm font-medium text-headline">{nombre}</span>
                        <span
                          className={cn("truncate text-sm", error ? "font-medium text-status-danger-fg" : "text-body")}
                          title={texto}
                        >
                          {texto}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-text-soft transition-transform duration-150",
                            diaAbierto === day && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <div className="grid min-h-11 grid-cols-[5.5rem_minmax(0,1fr)_1.25rem] items-center gap-1.5 px-3">
                        <span className="text-sm font-medium text-headline">{nombre}</span>
                        <span className="text-sm text-text-soft">Cerrado</span>
                        <span aria-hidden />
                      </div>
                    )}
                    <Interruptor
                      id={`${id}-${day}-abierto`}
                      checked={abierto}
                      onChange={(valor) => abrirDia(day, valor)}
                      label={`Abierto el ${nombre.toLowerCase()}`}
                      disabled={disabled || ultimoAbierto}
                    />
                  </div>

                  {abierto && diaAbierto === day && (
                    <div id={`${id}-dia-${day}`} className="bg-surface-2 px-3 pb-3 pt-1 sm:pl-[6.5rem]">
                      <div className="flex flex-col gap-1.5">
                        {delDia.map((franja, k) => (
                          <div key={franja.i} className="flex flex-wrap items-center gap-1.5">
                            <div className="w-[8.5rem]">
                              <Select
                                aria-label={`${nombre}: abre`}
                                value={franja.from}
                                disabled={disabled}
                                className="h-11 w-full sm:h-10"
                                onChange={(event) => cambiarFranja(franja.i, { from: event.target.value })}
                              >
                                {opcionesDeHora(30, 0, 23.5, franja.from).map((opcion) => (
                                  <option key={opcion.value} value={opcion.value}>
                                    {opcion.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <span className="text-xs text-text-soft">a</span>
                            <div className="w-[8.5rem]">
                              <Select
                                aria-label={`${nombre}: cierra`}
                                value={franja.to}
                                disabled={disabled}
                                className="h-11 w-full sm:h-10"
                                onChange={(event) => cambiarFranja(franja.i, { to: event.target.value })}
                              >
                                {opcionesDeHora(30, 0, 23.5, franja.to).map((opcion) => (
                                  <option key={opcion.value} value={opcion.value}>
                                    {opcion.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            {k > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 text-text-soft sm:h-9 sm:w-9"
                                aria-label={`Quitar la franja ${k + 1} del ${nombre.toLowerCase()}`}
                                disabled={disabled}
                                onClick={() => quitarFranja(franja.i)}
                              >
                                <X className="h-4 w-4" aria-hidden />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-11 px-2 text-xs text-link hover:bg-focus/10 sm:h-9"
                          disabled={disabled || !puedeAgregar(day)}
                          title={puedeAgregar(day) ? undefined : "No caben más franjas este día"}
                          onClick={() => agregarFranja(day)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Otra franja
                        </Button>
                        {day === 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-11 px-2 text-xs text-link hover:bg-focus/10 sm:h-9"
                            disabled={disabled}
                            onClick={copiarLunes}
                          >
                            Copiar a martes–viernes
                          </Button>
                        )}
                        {day === 0 && copiaAnterior && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-11 px-2 text-xs text-link hover:bg-focus/10 sm:h-9"
                            disabled={disabled}
                            onClick={deshacerCopia}
                          >
                            Deshacer
                          </Button>
                        )}
                      </div>

                      {error && (
                        <p role="alert" className="mt-1 flex items-start gap-1 text-xs text-status-danger-fg">
                          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                          {error}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {!modoInformativo && diasAbiertos === 1 && !disabled && (
            <p className="text-xs text-text-soft">
              Deja al menos un día abierto. Para no tener horario, activa «Atiende siempre».
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Editor heredado del horario por agente (Personalizar › Horario y reglas).
 * La configuración del negocio usa `HorarioSemanal`; este se conserva para no
 * cambiar el flujo del agente en este PR.
 * ------------------------------------------------------------------------ */
const DIAS_LEGACY = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
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
      {DIAS_LEGACY.map((nombre, dia) => {
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
