"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Switch } from "@/components/ui/switch";
import type { OpcionesDirectasBandera } from "@/lib/api/types";
import {
  DESCRIPCION,
  ESTADO,
  TITULO,
  avisoDeExito,
  confirmarApagar,
  confirmarEncender,
  esReintentable,
  mensajeDeError,
} from "@/lib/opciones-directas-bandera";
import { useAction } from "@/lib/use-action";

type Lectura = { habilitada: boolean } | { status: number };

async function leer(url: string): Promise<Lectura> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { status: res.status };
    const json = (await res.json().catch(() => null)) as Partial<OpcionesDirectasBandera> | null;
    return typeof json?.habilitada === "boolean" ? { habilitada: json.habilitada } : { status: 502 };
  } catch {
    return { status: 0 };
  }
}

/**
 * Interruptor «Plantillas con opciones» del negocio (SPEC-40, PR 10b). Solo lo monta el master:
 * lee con GET, enciende o apaga con PUT `{habilitada}` tras una confirmación y muestra el estado que
 * devuelve la API. El permiso lo decide el backend (403 para cualquiera que no sea el master).
 */
export function OpcionesDirectasSection({
  tenantId,
  negocio,
  enfocar = false,
}: {
  tenantId: string;
  /** Nombre visible del negocio, para las confirmaciones. */
  negocio: string;
  /** Llega por el enlace del editor: desplaza la vista aquí y deja el foco en el interruptor. */
  enfocar?: boolean;
}) {
  const url = `/api/platform/tenants/${tenantId}/opciones-directas`;
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [habilitada, setHabilitada] = useState<boolean | null>(null);
  const [falla, setFalla] = useState<number | null>(null);
  const [errorDeCambio, setErrorDeCambio] = useState<{ status: number; mensaje: string } | null>(null);
  const enCurso = useRef(false);
  const seccion = useRef<HTMLElement>(null);
  const interruptor = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    setFalla(null);
    const lectura = await leer(url);
    if ("status" in lectura) setFalla(lectura.status);
    else setHabilitada(lectura.habilitada);
  }, [url]);

  useEffect(() => {
    let vigente = true;
    void leer(url).then((lectura) => {
      if (!vigente) return;
      if ("status" in lectura) setFalla(lectura.status);
      else setHabilitada(lectura.habilitada);
    });
    return () => {
      vigente = false;
    };
  }, [url]);

  const listo = habilitada !== null;
  const resuelto = listo || falla !== null;
  useEffect(() => {
    if (!enfocar || !resuelto) return;
    seccion.current?.scrollIntoView?.({ block: "center" });
    interruptor.current?.querySelector<HTMLElement>("[role=switch]")?.focus();
  }, [enfocar, resuelto]);

  async function cambiar(objetivo: boolean) {
    // El diálogo se espera antes de `pending`: sin esta guarda, dos clics seguidos abrirían dos.
    if (enCurso.current) return;
    enCurso.current = true;
    try {
      const ok = await confirm(objetivo ? confirmarEncender(negocio) : confirmarApagar(negocio));
      if (!ok) return;
      setErrorDeCambio(null);
      await run(async () => {
        let res: Response;
        try {
          res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habilitada: objetivo }),
          });
        } catch {
          setErrorDeCambio({ status: 0, mensaje: mensajeDeError(0) });
          return { ok: false, error: mensajeDeError(0) };
        }
        if (!res.ok) {
          const mensaje = mensajeDeError(res.status);
          setErrorDeCambio({ status: res.status, mensaje });
          return { ok: false, status: res.status, error: mensaje };
        }
        const json = (await res.json().catch(() => null)) as Partial<OpcionesDirectasBandera> | null;
        // Se muestra lo que la API confirmó (es idempotente: repetir el mismo valor deja el mismo estado).
        const confirmada = typeof json?.habilitada === "boolean" ? json.habilitada : objetivo;
        setHabilitada(confirmada);
        return { ok: true, success: avisoDeExito(confirmada, negocio) };
      });
    } finally {
      enCurso.current = false;
    }
  }

  const titulo = `opd-${tenantId}`;
  return (
    <section ref={seccion} id="opciones-directas" className="flex scroll-mt-4 flex-col gap-3" aria-labelledby={titulo}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={titulo} className="text-sm font-medium text-headline">
          {TITULO}
        </p>
        {listo && (
          <Badge variant={habilitada ? "success" : "neutral"}>{habilitada ? ESTADO.encendida : ESTADO.apagada}</Badge>
        )}
      </div>
      <p className="text-xs text-body">{DESCRIPCION}</p>

      {falla !== null ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-border-soft p-3 text-sm">
          <p className="text-status-danger-fg">{mensajeDeError(falla)}</p>
          {esReintentable(falla) && (
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => void cargar()}>
                Reintentar
              </Button>
            </div>
          )}
        </div>
      ) : !listo ? (
        <p className="text-sm text-body">Cargando…</p>
      ) : (
        <>
          <div ref={interruptor} className="flex items-center justify-between gap-3">
            <label htmlFor={`opd-sw-${tenantId}`} className="text-sm text-body">
              Encendidas en este negocio
            </label>
            <Switch
              id={`opd-sw-${tenantId}`}
              aria-label={TITULO}
              checked={habilitada}
              onCheckedChange={(objetivo) => void cambiar(objetivo)}
              disabled={pending}
              tone="success"
            />
          </div>
          {errorDeCambio && (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-border-soft p-3 text-sm">
              <p className="text-status-danger-fg">{errorDeCambio.mensaje}</p>
              <p className="text-xs text-body">
                {esReintentable(errorDeCambio.status)
                  ? "Puede que el cambio no se haya aplicado. Usa el interruptor para volver a intentarlo: repetirlo es seguro."
                  : "No se cambió nada."}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
