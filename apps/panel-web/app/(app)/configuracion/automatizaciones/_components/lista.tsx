"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useFormato } from "@/components/shell/formato";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { Switch } from "@/components/ui/switch";
import type { Automatizacion, AutomatizacionesResumen } from "@/lib/api/types";

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const ESTADO: Record<NonNullable<Automatizacion["last_status"]>, string> = {
  success: "Al día",
  failed: "Con fallo",
  skipped: "Omitida",
};

type Cambios = { habilitada?: boolean; hora_local?: number | null; ventana?: Automatizacion["ventana"] };

function horario(item: Automatizacion): string {
  if (!item.habilitada) return "Apagada";
  const partes: string[] = [];
  if (item.hora_local !== null) {
    partes.push(`Todos los días a las ${String(item.hora_local).padStart(2, "0")}:00`);
  }
  if (item.ventana) {
    const dias =
      item.ventana.dias.length === 7 ? "" : ` (${item.ventana.dias.map((d) => DIAS[d]).join(", ")})`;
    partes.push(`Solo de ${item.ventana.desde} a ${item.ventana.hasta}${dias}`);
  }
  return partes.length > 0 ? partes.join(" · ") : "El horario del sistema";
}

export function ListaAutomatizaciones({
  items,
  resumen,
  puedeEditar,
}: {
  items: Automatizacion[];
  resumen: AutomatizacionesResumen;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const { fechaHora } = useFormato();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardar(item: Automatizacion, cambios: Cambios) {
    if (!puedeEditar || guardando) return;
    if (item.sensitive && cambios.habilitada !== undefined) {
      const encender = cambios.habilitada;
      const ok = await confirmar({
        title: `${encender ? "Encender" : "Apagar"} «${item.label}»`,
        description: encender
          ? "Esta automatización toca dinero o escribe a clientes. Se ejecutará en el próximo horario."
          : "Dejará de ejecutarse para este negocio hasta que la vuelvas a encender.",
        confirmLabel: encender ? "Encender" : "Apagar",
        destructive: !encender,
      });
      if (!ok) return;
    }
    setError(null);
    setGuardando(item.name);
    const res = await fetch(`/api/automatizaciones/${encodeURIComponent(item.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    setGuardando(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(data?.error?.message ?? "No se pudo guardar la automatización.");
      return;
    }
    startTransition(() => router.refresh());
  }

  const modulos = new Map<string, Automatizacion[]>();
  for (const item of items) {
    const lista = modulos.get(item.module) ?? [];
    lista.push(item);
    modulos.set(item.module, lista);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-body">
        {resumen.total} automatizaciones · {resumen.habilitadas} encendidas
        {resumen.apagadas > 0 && ` · ${resumen.apagadas} apagadas`}
        {resumen.con_fallo > 0 && ` · ${resumen.con_fallo} con fallo`}
      </p>
      {error && (
        <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
          {error}
        </p>
      )}
      {items.length === 0 && (
        <p className="rounded-lg border border-border-soft bg-surface px-4 py-6 text-sm text-text-soft">
          Este negocio no tiene automatizaciones disponibles. Se encienden al instalar una habilidad.
        </p>
      )}
      {[...modulos.entries()].map(([modulo, crons]) => (
        <section key={modulo} className="flex flex-col gap-3" aria-labelledby={`modulo-${modulo}`}>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id={`modulo-${modulo}`} className="text-sh-block font-display text-headline">
              {modulo}
            </h2>
            <span className="text-sm text-text-soft">
              {crons.length} {crons.length === 1 ? "automatización" : "automatizaciones"}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {crons.map((item) => (
              <article key={item.name} className="flex flex-col gap-4 rounded-lg border border-border-soft bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-headline">{item.label}</span>
                      {item.sensitive && <Badge variant="info">Toca clientes</Badge>}
                      {!item.configurable && <Badge variant="warning">Siempre encendida</Badge>}
                    </span>
                    <span className="text-sm text-text-soft">{item.description}</span>
                  </div>
                  {item.configurable && (
                    <Switch
                      checked={item.habilitada}
                      disabled={!puedeEditar || guardando === item.name}
                      onCheckedChange={(v) => guardar(item, { habilitada: v })}
                      aria-label={`${item.habilitada ? "Apagar" : "Encender"} ${item.label}`}
                    />
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-text-soft">Horario</dt>
                    <dd className="text-body">{horario(item)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-soft">Próxima</dt>
                    <dd className="text-body">
                      {!item.habilitada ? "Apagada" : item.next_run_at ? fechaHora(item.next_run_at) : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-text-soft">Última</dt>
                    <dd className="text-body">
                      {item.last_run_at
                        ? `${fechaHora(item.last_run_at)} · ${item.last_resumen ?? ESTADO[item.last_status ?? "success"]}`
                        : "Sin ejecuciones"}
                    </dd>
                  </div>
                </dl>

                {item.admite_hora_local && (
                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-text-soft">Hora local</span>
                    <select
                      className="rounded-md border border-control-border bg-surface px-2 py-1 text-body"
                      value={item.hora_local_personalizada ? (item.hora_local ?? "") : ""}
                      disabled={!puedeEditar || !item.habilitada || guardando === item.name}
                      onChange={(e) =>
                        guardar(item, { hora_local: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    >
                      <option value="">
                        La del sistema
                        {item.hora_local_por_defecto !== null
                          ? ` (${String(item.hora_local_por_defecto).padStart(2, "0")}:00)`
                          : ""}
                      </option>
                      {HORAS.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {item.admite_ventana && (
                  <VentanaEditor
                    item={item}
                    disabled={!puedeEditar || !item.habilitada || guardando === item.name}
                    onGuardar={(ventana) => guardar(item, { ventana })}
                  />
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/configuracion/automatizaciones/${encodeURIComponent(item.name)}`}
                    className="text-sm font-medium text-focus underline-offset-4 hover:underline"
                  >
                    Ver historial
                  </Link>
                  {item.pack && item.parametros.length > 0 && (
                    <Link
                      href={`/habilidades/${encodeURIComponent(item.pack)}`}
                      className="text-sm font-medium text-focus underline-offset-4 hover:underline"
                    >
                      Configurar {item.parametros.join(", ")}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function VentanaEditor({
  item,
  disabled,
  onGuardar,
}: {
  item: Automatizacion;
  disabled: boolean;
  onGuardar: (ventana: Automatizacion["ventana"]) => void;
}) {
  const [desde, setDesde] = useState(item.ventana?.desde ?? "08:00");
  const [hasta, setHasta] = useState(item.ventana?.hasta ?? "18:00");
  const [dias, setDias] = useState<number[]>(item.ventana?.dias ?? [0, 1, 2, 3, 4, 5, 6]);

  function alternarDia(dia: number) {
    setDias((actual) => (actual.includes(dia) ? actual.filter((d) => d !== dia) : [...actual, dia].sort()));
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-border-soft p-3" disabled={disabled}>
      <legend className="px-1 text-sm text-text-soft">Ventana horaria (hora local)</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          <span className="text-text-soft">Desde</span>
          <input
            type="time"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-md border border-control-border bg-surface px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-text-soft">Hasta</span>
          <input
            type="time"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-md border border-control-border bg-surface px-2 py-1"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {DIAS.map((dia, i) => (
          <label key={dia} className="flex items-center gap-1">
            <input type="checkbox" checked={dias.includes(i)} onChange={() => alternarDia(i)} />
            <span className="capitalize">{dia}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-control-border px-3 py-1 text-sm font-medium hover:bg-bg-deep"
          onClick={() => onGuardar({ desde, hasta, dias })}
        >
          Guardar ventana
        </button>
        {item.ventana && (
          <button
            type="button"
            className="rounded-md px-3 py-1 text-sm text-text-soft underline-offset-4 hover:underline"
            onClick={() => onGuardar(null)}
          >
            Quitar ventana
          </button>
        )}
      </div>
    </fieldset>
  );
}
