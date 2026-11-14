"use client";

import { useState } from "react";
import Link from "next/link";

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ConexionDelAgente } from "@/lib/agentes-ficha";

/**
 * «Probar» de la ficha del agente (HU-UX-09, AGT-10): un botón que abre el chat de prueba en un
 * cajón, por una conexión donde está el agente. Responde la versión ACTIVA de esa conexión y es su
 * Coordinador quien elige qué agente contesta, igual que con un cliente: el borrador no entra.
 */
export function ProbarAgente({
  nombre,
  conexiones,
  inicial,
  asignarHref,
  abierto = false,
}: {
  nombre: string;
  conexiones: ConexionDelAgente[];
  /** La conexión con la que abre: la principal donde atiende, si no la primera. */
  inicial: ConexionDelAgente | null;
  asignarHref: string | null;
  /** `?tab=probar` (enlaces de antes): abre con el cajón abierto. */
  abierto?: boolean;
}) {
  const [elegida, setElegida] = useState(inicial?.id ?? "");
  const conexion = conexiones.find((c) => c.id === elegida) ?? inicial;
  return (
    <Sheet defaultOpen={abierto}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          Probar
        </Button>
      </SheetTrigger>
      <SheetContent
        title={`Probar a ${nombre}`}
        description={
          conexion
            ? "Escribe como lo haría un cliente. Responde lo que está publicado en la conexión; no se envía nada por el canal ni se crea data real (las acciones se simulan)."
            : undefined
        }
        className="sm:max-w-xl"
      >
        {!conexion ? (
          <div role="status" className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-fg">
            <p>
              Para probar a {nombre} tiene que estar en una conexión: la prueba corre por la conexión, como con un cliente real.
            </p>
            {asignarHref && (
              <div>
                <Button asChild variant="accent">
                  <Link href={asignarHref}>Asignar a una conexión</Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {conexiones.length > 1 &&
              (conexiones.length <= 3 ? (
                <SegmentedControl
                  label="Conexión de la prueba"
                  value={conexion.id}
                  onChange={setElegida}
                  options={conexiones.map((c) => ({ value: c.id, label: c.label }))}
                />
              ) : (
                <Select aria-label="Conexión de la prueba" value={conexion.id} onChange={(e) => setElegida(e.target.value)}>
                  {conexiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              ))}
            {!conexion.atiende && (
              <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
                {nombre} no está atendiendo en {conexion.label} ({conexion.estado.label.toLowerCase()}): la prueba la responde otro agente.
              </p>
            )}
            {conexion.atiende && conexion.version === null && (
              <p role="status" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
                {nombre} todavía no está publicado en {conexion.label}: publícalo para que entre en la prueba.
              </p>
            )}
            <ChatPrueba key={conexion.id} conexionId={conexion.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
