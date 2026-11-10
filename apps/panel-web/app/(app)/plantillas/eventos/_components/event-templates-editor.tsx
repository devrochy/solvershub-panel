"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { TextoConChips } from "@/app/(app)/plantillas-opciones/_components/texto-con-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { EventTemplateEntry, MessageTemplatesSettings } from "@/lib/api/types";
import {
  CANALES_DE_TEXTO,
  TEXTO_POR_CANAL_MAX,
  admiteTextoPorCanal,
  avisosPorModulo,
  claveDePlantilla,
  datosEnPalabras,
  estadoDeAviso,
  eventoLabel,
  faltantes,
  mapeoParaApi,
  moduloDeEvento,
  rellenarCuerpo,
  rutasDesdeApi,
  textosPorCanalParaApi,
  variablesNoPermitidas,
} from "@/lib/plantillas";
import { useAction } from "@/lib/use-action";

type Estado = {
  plantilla: string;
  rutas: Record<string, string>;
  respaldo: string;
  /** Texto del aviso por tipo de conexión (ADR-0178 D2), con las mismas `{ruta}` del evento. */
  porCanal: Record<string, string>;
};

type Evento = MessageTemplatesSettings["events"][number];

/**
 * Avisos por evento (HU-ARCH-13, PLA-07 a PLA-09): una lista corta por módulo con lo que le llega al cliente,
 * y cada aviso se edita en un cajón con su propio Guardar. La API guarda el mapa completo, así que guardar
 * un aviso manda todos con lo que ya estaba guardado de los demás.
 */
export function EventTemplatesEditor({ initial }: { initial: MessageTemplatesSettings }) {
  const plantillas = initial.templates ?? [];
  const porClave = new Map(plantillas.map((t) => [claveDePlantilla(t.name, t.language), t]));

  const [estado, setEstado] = useState<Record<string, Estado>>(() =>
    Object.fromEntries(
      initial.events.map((ev) => {
        const guardado = initial.mapping[ev.event] as EventTemplateEntry | undefined;
        const clave = guardado?.template ? claveDePlantilla(guardado.template, guardado.language ?? "es") : "";
        const variables = porClave.get(clave)?.variables ?? [];
        return [
          ev.event,
          {
            plantilla: clave,
            rutas: rutasDesdeApi(variables, guardado?.variables as string[] | Record<string, string>),
            respaldo: guardado?.fallback_text ?? "",
            porCanal: { ...(guardado?.fallback_text_by_channel ?? {}) },
          },
        ];
      }),
    ),
  );
  const [abierto, setAbierto] = useState<{ evento: Evento; borrador: Estado } | null>(null);
  const [conCanales, setConCanales] = useState(false);
  const guardar = useAction();
  const confirmar = useConfirm();

  // Eventos que ya tenían textos por canal guardados: si el dueño los vacía hay que mandar el evento con `{}`,
  // porque la API conserva lo guardado cuando el evento no llega.
  const conTextosGuardados = new Set(
    initial.events
      .filter((ev) => Object.keys(initial.mapping[ev.event]?.fallback_text_by_channel ?? {}).length > 0)
      .map((ev) => ev.event),
  );

  function abrir(ev: Evento) {
    const e = estado[ev.event];
    setConCanales(Object.values(e.porCanal).some((t) => t.trim()));
    setAbierto({ evento: ev, borrador: { ...e, rutas: { ...e.rutas }, porCanal: { ...e.porCanal } } });
  }

  /** Cierra el cajón; si hay cambios sin guardar, pregunta antes de descartarlos. */
  async function cerrar() {
    if (!abierto) return;
    const sinCambios = JSON.stringify(abierto.borrador) === JSON.stringify(estado[abierto.evento.event]);
    if (!sinCambios) {
      const descartar = await confirmar({
        title: "¿Descartar los cambios?",
        description: `Lo que cambiaste en «${eventoLabel(abierto.evento.event)}» no se guarda.`,
        confirmLabel: "Descartar",
        cancelLabel: "Seguir editando",
        destructive: true,
      });
      if (!descartar) return;
    }
    setAbierto(null);
  }

  function cambiar(cambio: Partial<Estado>) {
    setAbierto((prev) => (prev ? { ...prev, borrador: { ...prev.borrador, ...cambio } } : prev));
  }

  async function guardarAviso() {
    if (!abierto) return;
    const siguiente = { ...estado, [abierto.evento.event]: abierto.borrador };
    // Sin `option_template`: el servidor conserva el puente a la plantilla con opciones (D3) si el campo no viaja.
    const mapping: Record<string, Omit<EventTemplateEntry, "option_template">> = {};
    for (const ev of initial.events) {
      const e = siguiente[ev.event];
      const t = porClave.get(e.plantilla);
      const porCanal = textosPorCanalParaApi(ev.event, e.porCanal);
      if (!t && !e.respaldo.trim() && Object.keys(porCanal).length === 0 && !conTextosGuardados.has(ev.event)) continue;
      mapping[ev.event] = {
        template: t?.name ?? "",
        language: t?.language ?? "es",
        variables: t ? mapeoParaApi(t.variables, t.named, e.rutas) : [],
        fallback_text: e.respaldo,
        fallback_text_by_channel: porCanal,
      };
    }
    const ok = await guardar.run(async () => {
      const res = await fetch("/api/settings/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: `Aviso «${eventoLabel(abierto.evento.event)}» guardado.` };
    });
    if (ok) {
      setEstado(siguiente);
      setAbierto(null);
    }
  }

  const grupos = avisosPorModulo(initial.events);
  const ev = abierto?.evento;
  const e = abierto?.borrador;
  const t = e ? porClave.get(e.plantilla) : undefined;
  const permitidas = ev ? Object.keys(ev.variables) : [];
  const incompleto = Boolean(t && e && faltantes(t.variables, e.rutas).length > 0);
  const conInvalidas = Boolean(
    ev && e && CANALES_DE_TEXTO.some(({ tipo }) => admiteTextoPorCanal(ev.event, tipo) && variablesNoPermitidas(e.porCanal[tipo] ?? "", permitidas).length > 0),
  );
  const textosPorCanal = e ? Object.values(e.porCanal).filter((x) => x.trim()).length : 0;

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {grupos.map((grupo) => (
          <section key={grupo.modulo} aria-labelledby={`modulo-${grupo.modulo}`} className="overflow-hidden rounded-lg border border-border-soft bg-surface">
            <h2 id={`modulo-${grupo.modulo}`} className="px-4 pt-4 pb-2 font-display text-sh-block text-headline">
              {grupo.modulo}
            </h2>
            <ul>
              {grupo.eventos.map((evento) => {
                const aviso = estadoDeAviso(estado[evento.event]);
                return (
                  <li key={evento.event} className="border-t border-border-soft">
                    <button
                      type="button"
                      onClick={() => abrir(evento)}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium text-headline">{eventoLabel(evento.event)}</span>
                        <span className="text-xs text-text-soft">{aviso.detalle}</span>
                        <Badge variant={aviso.tono} className="mt-1.5 self-start sm:hidden">
                          {aviso.etiqueta}
                        </Badge>
                      </span>
                      <Badge variant={aviso.tono} className="max-sm:hidden">
                        {aviso.etiqueta}
                      </Badge>
                      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-text-soft" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Sheet open={abierto !== null} onOpenChange={(o) => !o && void cerrar()}>
        {ev && e && (
          <SheetContent
            title={eventoLabel(ev.event)}
            description={`Aviso de ${moduloDeEvento(ev.event)}`}
            className="sm:max-w-xl"
            footer={
              <div className="flex w-full flex-wrap items-center justify-end gap-3">
                {conInvalidas && <p className="text-xs text-status-danger-fg">Quita los datos que este aviso no admite.</p>}
                {incompleto && <p className="text-xs text-status-warning-fg">Elige un dato para cada espacio de la plantilla.</p>}
                <Button type="button" variant="ghost" onClick={() => void cerrar()}>
                  Cancelar
                </Button>
                <Button type="button" variant="accent" onClick={() => void guardarAviso()} loading={guardar.pending} disabled={incompleto || conInvalidas}>
                  Guardar aviso
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-3" aria-labelledby="fuera-24">
                <h3 id="fuera-24" className="text-sm font-medium text-headline">
                  Fuera de las 24 horas
                </h3>
                <Field
                  label="Plantilla aprobada por Meta"
                  htmlFor={`ev-${ev.event}`}
                  help={plantillas.length === 0 ? undefined : "Sale aunque el cliente no haya escrito en el último día."}
                >
                  <Select id={`ev-${ev.event}`} value={e.plantilla} onChange={(event) => cambiar({ plantilla: event.target.value, rutas: {} })}>
                    <option value="">Ninguna: el aviso no sale</option>
                    {plantillas.map((p) => (
                      <option key={claveDePlantilla(p.name, p.language)} value={claveDePlantilla(p.name, p.language)}>
                        {p.name} ({p.language})
                      </option>
                    ))}
                  </Select>
                </Field>
                {plantillas.length === 0 && (
                  <p className="text-sm text-body">
                    Todavía no tienes plantillas aprobadas. Crea una de «Utilidad» en la conexión de WhatsApp y espera su aprobación.{" "}
                    <Link href="/conexiones" className="text-link hover:underline">
                      Ir a Conexiones
                    </Link>
                  </p>
                )}
                {t &&
                  t.variables.map((v, i) => (
                    <Field key={v} label={`Dato del espacio ${i + 1} de la plantilla`} htmlFor={`ev-${ev.event}-${v}`}>
                      <Select id={`ev-${ev.event}-${v}`} value={e.rutas[v] ?? ""} onChange={(event) => cambiar({ rutas: { ...e.rutas, [v]: event.target.value } })}>
                        <option value="">Elige el dato…</option>
                        {Object.entries(ev.variables).map(([ruta, descripcion]) => (
                          <option key={ruta} value={ruta}>
                            {descripcion}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                {t && (
                  <p className="rounded-md bg-surface-2 p-3 text-sm text-body">
                    {rellenarCuerpo(
                      t.body,
                      Object.fromEntries(t.variables.map((v) => [v, e.rutas[v] ? `«${ev.variables[e.rutas[v]] ?? e.rutas[v]}»` : ""])),
                    )}
                  </p>
                )}
              </section>

              <section className="flex flex-col gap-3" aria-labelledby="dentro-24">
                <h3 id="dentro-24" className="text-sm font-medium text-headline">
                  Dentro de las 24 horas
                </h3>
                <TextoConChips
                  label="Texto del aviso"
                  value={e.respaldo}
                  onChange={(respaldo) => cambiar({ respaldo })}
                  max={1000}
                  rows={3}
                  chips={Object.entries(ev.variables).map(([ruta, descripcion]) => ({ etiqueta: descripcion, texto: `{${ruta}}`, ayuda: `Se reemplaza por: ${descripcion}` }))}
                  chipsLabel="Agregar un dato"
                  help="Se envía a quien escribió en el último día. Toca un dato para ponerlo donde está el cursor."
                />
              </section>

              <section className="flex flex-col gap-3">
                <button
                  type="button"
                  aria-expanded={conCanales}
                  aria-controls={`canales-${ev.event}`}
                  onClick={() => setConCanales((v) => !v)}
                  className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span>
                    Texto por canal (opcional)
                    <span className="text-text-soft"> · {textosPorCanal === 0 ? "ninguno con texto" : `${textosPorCanal} de ${CANALES_DE_TEXTO.length} con texto`}</span>
                  </span>
                  <ChevronDown aria-hidden className={`h-4 w-4 text-text-soft transition-transform ${conCanales ? "rotate-180" : ""}`} />
                </button>
                {conCanales && (
                  <div id={`canales-${ev.event}`} className="flex flex-col gap-3">
                    <p className="text-xs text-text-soft">
                      Para QR, chat web, Messenger e Instagram. Solo se envían cuando SolversHub activa los avisos por canal en tu negocio; mientras tanto se
                      guardan. Datos que puedes usar: {datosEnPalabras(ev.variables)}.
                    </p>
                    {CANALES_DE_TEXTO.map(({ tipo, etiqueta, ayuda }) => {
                      const id = `ev-${ev.event}-canal-${tipo}`;
                      const admitido = admiteTextoPorCanal(ev.event, tipo);
                      const texto = e.porCanal[tipo] ?? "";
                      const invalidas = admitido ? variablesNoPermitidas(texto, permitidas) : [];
                      return (
                        <Field
                          key={tipo}
                          label={etiqueta}
                          htmlFor={id}
                          help={
                            admitido
                              ? `${ayuda} ${texto.length}/${TEXTO_POR_CANAL_MAX} caracteres.`
                              : "Los avisos de cobro no salen por QR: no se puede garantizar que lleguen en el horario permitido por la ley."
                          }
                          error={invalidas.length > 0 ? `Este aviso no admite: ${invalidas.map((v) => `{${v}}`).join(", ")}.` : undefined}
                        >
                          <Textarea
                            id={id}
                            rows={2}
                            maxLength={TEXTO_POR_CANAL_MAX}
                            disabled={!admitido}
                            value={admitido ? texto : ""}
                            onChange={(event) => cambiar({ porCanal: { ...e.porCanal, [tipo]: event.target.value } })}
                          />
                        </Field>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
