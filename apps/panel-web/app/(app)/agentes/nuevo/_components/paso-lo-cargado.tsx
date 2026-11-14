"use client";

import { useEffect, useState } from "react";

import type { RegistroDePrueba, RegistrosDePrueba } from "@/lib/api/types";
import { leerJson, sugerenciasDePrueba } from "@/lib/carga-de-datos";

/** Nombre legible de cada tipo de registro de los packs. */
const TIPO: Record<string, string> = {
  producto: "Producto",
  categoria: "Categoría",
  tipo: "Tipo de cita",
  cita: "Cita",
  cartera: "Cartera",
  cliente: "Cliente",
  prestamo: "Préstamo",
  plan: "Plan",
  suscripcion: "Suscripción",
};

/**
 * Paso «Lo que quedó cargado» (SPEC-45, HU-QA-16): la lista de lo generado o importado, para tenerla a mano
 * al probar el agente, y frases sugeridas armadas con esos nombres. En test la lista sale de la API de
 * registros; en producción (donde esa API no existe) de lo que se acaba de importar.
 */
export function PasoLoCargado({
  agenteId,
  locales,
  resumen,
}: {
  agenteId: string;
  locales: RegistroDePrueba[];
  resumen: string | null;
}) {
  const [registros, setRegistros] = useState<RegistroDePrueba[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let vivo = true;
    void leerJson<RegistrosDePrueba>(`/api/agentes/${agenteId}/datos-de-prueba/registros`).then((r) => {
      if (!vivo) return;
      if (r.ok && r.data.registros.length > 0) {
        setRegistros(r.data.registros);
        setTotal(r.data.total);
      } else {
        setRegistros(locales);
        setTotal(locales.length);
      }
    });
    return () => {
      vivo = false;
    };
  }, [agenteId, locales]);

  if (registros === null) return <p className="text-sm text-text-soft">Buscando lo que se cargó…</p>;

  const frases = sugerenciasDePrueba(registros);

  return (
    <div className="flex flex-col gap-4">
      {resumen && <p className="text-sm text-body">{resumen}</p>}
      {registros.length === 0 ? (
        <p className="text-sm text-body">
          No cargaste datos todavía. Puedes publicar igual y cargarlos después desde la ficha del agente.
        </p>
      ) : (
        <>
          <ul aria-label="Lo que quedó cargado" className="flex max-h-80 flex-col divide-y divide-border-soft overflow-y-auto rounded-md border border-border-soft">
            {registros.map((r, i) => (
              <li key={`${r.tipo}-${r.nombre}-${i}`} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-sm">
                <span className="text-xs text-text-soft">{TIPO[r.tipo] ?? r.tipo}</span>
                <span className="text-headline">{r.nombre}</span>
                {r.detalle && <span className="text-text-soft">· {r.detalle}</span>}
              </li>
            ))}
          </ul>
          {total > registros.length && (
            <p className="text-xs text-text-soft">
              Se muestran {registros.length} de {total}.
            </p>
          )}
        </>
      )}
      {frases.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-headline">Para probarlo, pregúntale por ejemplo:</p>
          <ul className="list-disc pl-5 text-sm text-body">
            {frases.map((f) => (
              <li key={f}>«{f}»</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-body">
        Al publicarlo eliges en qué conexión atiende. Después lo pruebas desde su ficha con «Probar»; los clientes no
        lo ven hasta que lo actives.
      </p>
    </div>
  );
}
