"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { OpcionesPlantillaResumen } from "@/lib/api/types";
import { opcionesApi } from "@/lib/plantillas-opciones-cliente";
import { mensajeDeErrorPlayground } from "@/lib/playground-opciones";

/**
 * «Probar plantilla con opciones» (SPEC-40, pista B2): elige una plantilla publicada del negocio y la manda al chat
 * de prueba, donde sus botones se tocan sin Meta. El aviso de abajo siempre se ve: tocar un botón ejecuta la tool
 * de verdad contra los datos del negocio.
 */
export function ProbarPlantilla({
  inicial,
  ocupado,
  onEnviar,
}: {
  /** Clave que llega desde el editor («Probar en el playground»): queda elegida, sin enviarse. */
  inicial?: string;
  ocupado: boolean;
  onEnviar: (clave: string, nombre: string) => void;
}) {
  const [publicadas, setPublicadas] = useState<OpcionesPlantillaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState(inicial ?? "");

  useEffect(() => {
    let activo = true;
    void opcionesApi.listar().then((res) => {
      if (!activo) return;
      if (!res.ok) {
        setError(mensajeDeErrorPlayground(res));
        return;
      }
      setError(null);
      setPublicadas(res.data.plantillas.filter((p) => p.estado === "published"));
    });
    return () => {
      activo = false;
    };
  }, []);

  const actual = publicadas?.find((p) => p.clave === elegida);
  const faltaLaDelEditor = publicadas !== null && inicial && !publicadas.some((p) => p.clave === inicial);

  return (
    <section aria-label="Probar plantilla con opciones" className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-4">
      <h2 className="font-display text-base font-semibold text-headline">Probar plantilla con opciones</h2>
      <p className="text-sm text-text-soft">
        Manda al chat una plantilla publicada y toca sus botones como lo haría un cliente, sin pasar por Meta.
      </p>
      <p
        role="note"
        className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-fg"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Al tocar un botón la acción <strong>se ejecuta de verdad</strong> contra los datos de este negocio (puede leer o cambiar
          citas, clientes, etc.). Úsalo en un negocio o agente con datos de prueba.
        </span>
      </p>
      {error ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      ) : publicadas === null ? (
        <p role="status" className="text-sm text-text-soft">
          Cargando plantillas…
        </p>
      ) : publicadas.length === 0 ? (
        <p className="text-sm text-text-soft">
          Aún no hay plantillas publicadas. Crea y publica una en{" "}
          <Link className="text-link underline" href="/plantillas-opciones">
            Plantillas con opciones
          </Link>
          .
        </p>
      ) : (
        <>
          {faltaLaDelEditor && (
            <p role="status" className="text-sm text-status-warning-fg">
              La plantilla «{inicial}» no está publicada: publícala en el editor para probarla.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Plantilla" htmlFor="plantilla-con-opciones" className="min-w-56 flex-1">
              <Select id="plantilla-con-opciones" value={elegida} onChange={(e) => setElegida(e.target.value)}>
                <option value="">Elige una plantilla publicada…</option>
                {publicadas.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="accent" disabled={!actual || ocupado} onClick={() => actual && onEnviar(actual.clave, actual.nombre)}>
              <FlaskConical className="h-4 w-4" aria-hidden />
              Enviar al chat
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
