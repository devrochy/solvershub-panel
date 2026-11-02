"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LeadEditable } from "@/lib/api/types";
import {
  cuerpoDeSeguimiento,
  ESTADO_DE_SEGUIMIENTO,
  esHoraDelNegocio,
  seguimientoDeExtras,
  textoDeHoraDelNegocio,
} from "@/lib/seguimiento";
import { useAction } from "@/lib/use-action";

export const CLAVE_NOTA = "seguimiento_nota";
export const CLAVE_FECHA = "seguimiento_en";
const PLUGIN = "pack_commerce";

/** ¿Estos campos editables son los del seguimiento? Se muestran en su propia tarjeta, no en el formulario genérico. */
export function esCampoDeSeguimiento(clave: string): boolean {
  return clave === CLAVE_NOTA || clave === CLAVE_FECHA;
}

/**
 * Próxima acción del lead y cuándo (HU-CRM-21): se programa, se mueve, se quita o se marca como hecho
 * (y se programa el siguiente en el mismo gesto). La hora es la del negocio, no la del navegador.
 * Sin permiso de escritura solo se ve.
 */
export function SeguimientoDelLead({
  leadId,
  editables,
  extras,
  tieneLead,
  puedeEditar,
}: {
  leadId: string;
  editables: LeadEditable[];
  extras: Record<string, unknown>;
  /** El cliente ya tiene lead de venta; si no, programar el seguimiento le crea uno. */
  tieneLead: boolean;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const nota = editables.find((e) => e.key === CLAVE_NOTA);
  const fecha = editables.find((e) => e.key === CLAVE_FECHA);
  const guardar = useAction();
  const hecho = useAction();
  const [modo, setModo] = useState<"ver" | "editar" | "hecho">("ver");
  const [textoNota, setTextoNota] = useState(nota?.value ?? "");
  const [textoFecha, setTextoFecha] = useState(fecha?.value ?? "");
  const [siguienteNota, setSiguienteNota] = useState("");
  const [siguienteFecha, setSiguienteFecha] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  if (!nota || !fecha) return null;

  const seg = seguimientoDeExtras(extras);
  const estado = seg?.estado ? ESTADO_DE_SEGUIMIENTO[seg.estado] : null;
  const maximoNota = nota.max_length;

  function abrirEdicion() {
    setTextoNota(nota?.value ?? "");
    setTextoFecha(fecha?.value ?? "");
    setErrores({});
    setModo("editar");
  }

  async function enviarCambio(cuerpo: Record<string, string>, exito: string) {
    setErrores({});
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/pack/${PLUGIN}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: cuerpo }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErrores(json.fields);
      return { ok: res.ok, status: res.status, error: json.error, success: exito };
    });
    if (ok) {
      setModo("ver");
      router.refresh();
    }
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const faltantes: Record<string, string> = {};
    if (!esHoraDelNegocio(textoFecha)) faltantes[CLAVE_FECHA] = "Elige la fecha y la hora del seguimiento.";
    if (Object.keys(faltantes).length > 0) {
      setErrores(faltantes);
      return;
    }
    void enviarCambio(cuerpoDeSeguimiento(textoNota, textoFecha), "Seguimiento guardado.");
  }

  async function onHecho(e: React.FormEvent) {
    e.preventDefault();
    if (siguienteFecha && !esHoraDelNegocio(siguienteFecha)) {
      setErrores({ [CLAVE_FECHA]: "Elige la fecha y la hora del siguiente seguimiento." });
      return;
    }
    setErrores({});
    const ok = await hecho.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/seguimiento/hecho`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siguienteFecha ? { siguiente_en: siguienteFecha, siguiente_nota: siguienteNota } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErrores(json.fields);
      return {
        ok: res.ok,
        status: res.status,
        error: json.error,
        success: siguienteFecha ? "Hecho. Quedó programado el siguiente." : "Seguimiento hecho.",
      };
    });
    if (ok) {
      setSiguienteNota("");
      setSiguienteFecha("");
      setModo("ver");
      router.refresh();
    }
  }

  return (
    <section aria-labelledby="seguimiento-del-lead" className="space-y-3">
      <h3 id="seguimiento-del-lead" className="text-sm font-semibold text-headline">
        Próxima acción
      </h3>

      {modo === "ver" && (
        <>
          {seg ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {estado && <Badge variant={estado.tono}>{estado.texto}</Badge>}
                <span className="text-sm text-body">{textoDeHoraDelNegocio(fecha.value ?? "")}</span>
              </div>
              {seg.nota && <p className="break-words text-sm text-headline">{seg.nota}</p>}
            </div>
          ) : (
            <p className="text-sm text-text-soft">
              Sin seguimiento programado.
              {!tieneLead && " Al programar uno se crea el lead de venta de este cliente."}
            </p>
          )}
          {puedeEditar && (
            <div className="flex flex-wrap gap-2">
              {seg ? (
                <>
                  <Button size="sm" onClick={() => setModo("hecho")}>
                    Marcar hecho
                  </Button>
                  <Button size="sm" variant="outline" onClick={abrirEdicion}>
                    Cambiar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={guardar.pending}
                    onClick={() => void enviarCambio(cuerpoDeSeguimiento("", ""), "Seguimiento quitado.")}
                  >
                    Quitar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={abrirEdicion}>
                  Programar seguimiento
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {modo === "editar" && (
        <form onSubmit={onGuardar} className="space-y-3" noValidate>
          <Field label="Qué vas a hacer" htmlFor="seguimiento-nota" error={errores[CLAVE_NOTA]}>
            <Input
              id="seguimiento-nota"
              value={textoNota}
              onChange={(e) => setTextoNota(e.target.value)}
              maxLength={maximoNota}
              placeholder="Enviar cotización"
            />
          </Field>
          <Field
            label="Cuándo"
            htmlFor="seguimiento-fecha"
            help="Hora del negocio."
            error={errores[CLAVE_FECHA]}
          >
            <Input
              id="seguimiento-fecha"
              type="datetime-local"
              value={textoFecha}
              onChange={(e) => setTextoFecha(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setModo("ver")}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={guardar.pending}>
              Guardar
            </Button>
          </div>
        </form>
      )}

      {modo === "hecho" && (
        <form onSubmit={(e) => void onHecho(e)} className="space-y-3" noValidate>
          <p className="text-sm text-body">
            Queda en la historia del cliente. Si ya sabes el siguiente paso, prográmalo ahora.
          </p>
          <Field label="Siguiente: qué vas a hacer (opcional)" htmlFor="seguimiento-siguiente-nota">
            <Input
              id="seguimiento-siguiente-nota"
              value={siguienteNota}
              onChange={(e) => setSiguienteNota(e.target.value)}
              maxLength={maximoNota}
            />
          </Field>
          <Field
            label="Siguiente: cuándo (opcional)"
            htmlFor="seguimiento-siguiente-fecha"
            help="Hora del negocio."
            error={errores[CLAVE_FECHA]}
          >
            <Input
              id="seguimiento-siguiente-fecha"
              type="datetime-local"
              value={siguienteFecha}
              onChange={(e) => setSiguienteFecha(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setModo("ver")}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={hecho.pending}>
              {siguienteFecha ? "Hecho y programar siguiente" : "Marcar hecho"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
