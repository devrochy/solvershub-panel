"use client";

import { useCallback, useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationSummary, OpcionesPrueba } from "@/lib/api/types";
import { canalLabel } from "@/lib/labels";
import { claveDeIdempotencia, mensajeDeEnvio, resumenDePrueba } from "@/lib/plantillas-opciones";
import { opcionesApi } from "@/lib/plantillas-opciones-cliente";

type Conversaciones = { items: ConversationSummary[] };

/**
 * Enviar prueba (HU-OPC-06): manda la versión publicada a UNA conversación del propio negocio. Es un mensaje
 * real a un cliente real, así que pide una confirmación explícita. Quien lo usa lo monta al abrirlo («Más acciones»)
 * y lo desmonta al cerrar (`onCerrar`): la clave de idempotencia nace con el diálogo, así reintentar tras un fallo
 * no duplica el envío y abrirlo de nuevo es otro intento.
 */
export function EnviarPrueba({
  clave,
  version,
  hayCambiosSinPublicar,
  onCerrar,
}: {
  clave: string;
  version: number | null;
  hayCambiosSinPublicar: boolean;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<ConversationSummary[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [entendido, setEntendido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<OpcionesPrueba | null>(null);
  const [intento] = useState(() => claveDeIdempotencia());

  useEffect(() => {
    const control = new AbortController();
    const espera = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`, { signal: control.signal });
        const json = (await res.json().catch(() => null)) as (Conversaciones & { error?: string }) | null;
        if (!res.ok || !json) {
          setErrorLista(typeof json?.error === "string" ? json.error : "No se pudieron cargar las conversaciones.");
          return;
        }
        setErrorLista(null);
        setLista(json.items.slice(0, 20));
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setErrorLista("No se pudo contactar el servidor.");
      }
    }, q ? 300 : 0);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [q]);

  const enviar = useCallback(async () => {
    if (!elegida || !entendido) return;
    setEnviando(true);
    setError(null);
    const res = await opcionesApi.enviarPrueba(clave, { conversation_id: elegida, clave_idempotencia: intento });
    setEnviando(false);
    if (res.ok) setResultado(res.data);
    else setError(mensajeDeEnvio(res));
  }, [clave, elegida, entendido, intento]);

  const elegidaFila = lista?.find((c) => c.id === elegida);

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
        <DialogContent
          title="Enviar una prueba"
          description={`Se envía la versión${version ? ` ${version}` : ""} publicada a una conversación de tu negocio.`}
          className="max-h-[90vh] max-w-xl overflow-y-auto"
        >
          {resultado ? (
            <div className="flex flex-col gap-4">
              <p role="status" className="rounded-md bg-status-success-bg p-3 text-sm text-status-success-fg">
                {resultado.ya_enviado ? "Listo." : "Mensaje enviado."} {resumenDePrueba(resultado)}
              </p>
              <div className="flex justify-end">
                <Button type="button" onClick={onCerrar}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {hayCambiosSinPublicar && (
                <p className="rounded-md bg-status-info-bg p-3 text-xs text-status-info-fg">
                  Tienes cambios sin publicar: la prueba envía la versión {version} publicada, no el borrador.
                </p>
              )}
              <SearchInput label="Buscar una conversación" placeholder="Nombre o teléfono del cliente" value={q} onChange={setQ} />
              <fieldset className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                <legend className="sr-only">Conversación a la que se envía</legend>
                <FormFeedback error={errorLista} />
                {lista && lista.length === 0 && !errorLista && <p className="text-sm text-text-soft">No hay conversaciones que coincidan.</p>}
                {lista === null && !errorLista && (
                  <div role="status" aria-label="Cargando las conversaciones" className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                )}
                {lista?.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border-soft p-3 text-sm transition-colors hover:bg-hover has-[:checked]:border-focus has-[:checked]:bg-focus/10"
                  >
                    <input
                      type="radio"
                      name="conversacion-de-prueba"
                      value={c.id}
                      checked={elegida === c.id}
                      onChange={() => setElegida(c.id)}
                      className="mt-1 accent-[var(--sh-blue-500)]"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium text-headline">{c.customer_name || c.external_id || "Cliente sin nombre"}</span>
                      <span className="text-xs text-text-soft">
                        {canalLabel(c.channel)}
                        {c.last_message ? ` · ${c.last_message.slice(0, 60)}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-col gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3">
                <p className="flex items-start gap-2 text-sm font-medium text-status-warning-fg">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Esto envía un mensaje real a un cliente real.
                </p>
                <p className="text-xs text-status-warning-fg">
                  {elegidaFila ? `Lo recibirá ${elegidaFila.customer_name || elegidaFila.external_id || "ese cliente"} en su chat. ` : ""}
                  Si toca una opción, se ejecuta la acción de verdad.
                </p>
                <Checkbox
                  id="entiendo-envio-real"
                  label="Entiendo que se enviará un mensaje real a este cliente"
                  checked={entendido}
                  onCheckedChange={setEntendido}
                />
              </div>

              <FormFeedback error={error} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCerrar}>
                  Cancelar
                </Button>
                <Button type="button" variant="accent" loading={enviando} disabled={!elegida || !entendido} onClick={enviar}>
                  Enviar mensaje real
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
    </Dialog>
  );
}
