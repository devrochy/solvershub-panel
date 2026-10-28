"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  cuerpoDelAviso,
  MAX_TEXTO_AVISO,
  mensajeDeErrorAviso,
  puedeActivar,
  type AvisoDatos,
} from "@/lib/aviso-datos";
import { useAction } from "@/lib/use-action";

/**
 * Aviso de tratamiento de datos (HU-CRM-16): el texto que el asistente le muestra al cliente en el chat y
 * el interruptor para activarlo. Activarlo exige confirmar que el texto pasó por revisión legal; el
 * borrador que trae el sistema NO está validado legalmente.
 */
export function AvisoDatosCard({
  aviso,
  error,
  puedeEditar,
}: {
  /** Lo que devolvió el servidor; `null` si no se pudo cargar (se muestra `error`). */
  aviso: AvisoDatos | null;
  error?: string;
  puedeEditar: boolean;
}) {
  if (!aviso) {
    return (
      <Card>
        <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
          No se pudo cargar el aviso de datos{error ? `: ${error}` : "."} Recarga la página para intentarlo de nuevo.
        </CardContent>
      </Card>
    );
  }
  return <Editor aviso={aviso} puedeEditar={puedeEditar} />;
}

function Editor({ aviso, puedeEditar }: { aviso: AvisoDatos; puedeEditar: boolean }) {
  // Si no hay texto propio, se parte del borrador para que el dueño lo vea y lo edite.
  const [texto, setTexto] = useState(aviso.texto_propio || aviso.texto);
  const [activo, setActivo] = useState(aviso.activo);
  const [confirmo, setConfirmo] = useState(false);
  const [vista, setVista] = useState(aviso);
  if (vista !== aviso) {
    setVista(aviso);
    setTexto(aviso.texto_propio || aviso.texto);
    setActivo(aviso.activo);
    setConfirmo(false);
  }
  const { run, pending } = useAction();

  const sinGuardar = texto.trim() !== (aviso.texto_propio || aviso.texto).trim() || activo !== aviso.activo;
  // Dejar el borrador tal cual no cuenta como texto propio: sigue siendo borrador.
  const sigueBorrador = texto.trim() === aviso.texto.trim() && aviso.es_borrador && !aviso.texto_propio;
  const faltaConfirmar = activo && !aviso.activo && !puedeActivar(texto, confirmo, false);

  async function guardar() {
    await run(async () => {
      const res = await fetch("/api/datos-cliente/aviso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDelAviso(activo, sigueBorrador ? "" : texto, confirmo)),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const mensaje = typeof json.error === "string" ? json.error : undefined;
        return { ok: false, status: res.status, error: mensajeDeErrorAviso(res.status, mensaje) };
      }
      return { ok: true, success: activo ? "Aviso de datos guardado." : "Aviso de datos desactivado." };
    });
  }

  return (
    <section aria-labelledby="aviso-datos-titulo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="aviso-datos-titulo" className="text-sm font-semibold text-headline">
          Aviso de tratamiento de datos
        </h3>
        <Badge variant={aviso.activo ? "success" : "neutral"}>{aviso.activo ? "Activo" : "Apagado"}</Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <p className="max-w-2xl text-sm text-text-soft">
            Cuando está activo, el asistente le muestra este aviso al cliente en el chat (una vez por cada versión del texto) y
            solo guarda lo imprescindible mientras no responda «acepto». Si el cliente dice «no», no se le insiste. Apagado,
            todo funciona como siempre.
          </p>
          {aviso.es_borrador && !aviso.texto_propio && (
            <p role="note" className="flex items-start gap-2 text-sm text-status-warning-fg">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Este texto es un borrador y no está validado legalmente. Pásalo por quien asesora legalmente al negocio antes de
              activarlo.
            </p>
          )}
          <Field label="Texto del aviso" htmlFor="aviso-texto" help={`${texto.length} de ${MAX_TEXTO_AVISO} caracteres`}>
            <Textarea
              id="aviso-texto"
              value={texto}
              rows={5}
              maxLength={MAX_TEXTO_AVISO}
              disabled={!puedeEditar || pending}
              onChange={(e) => setTexto(e.target.value)}
            />
          </Field>
          {puedeEditar ? (
            <>
              <Checkbox
                id="aviso-activo"
                label="Activar el aviso en el chat"
                checked={activo}
                disabled={pending}
                onCheckedChange={setActivo}
              />
              {activo && !aviso.activo && (
                <Checkbox
                  id="aviso-revision-legal"
                  label="Confirmo que este texto fue revisado legalmente."
                  checked={confirmo}
                  disabled={pending}
                  onCheckedChange={setConfirmo}
                />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="accent" disabled={pending || !sinGuardar || faltaConfirmar} onClick={guardar}>
                  {pending ? "Guardando…" : "Guardar aviso"}
                </Button>
                {sinGuardar && !pending && <span className="text-sm text-text-soft">Tienes cambios sin guardar.</span>}
              </div>
            </>
          ) : (
            <p role="note" className="text-sm text-text-soft">
              Solo puedes ver esta configuración. Para cambiarla, pídele acceso a quien administra el negocio.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
