"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm";
import { Progress } from "@/components/ui/progress";
import { RadioGroup } from "@/components/ui/radio-group";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { textoDeAvance } from "@/lib/agente-asistente";
import type { CatalogoConfig, GuionAsistente, PreguntaAsistente, PropuestaAsistente } from "@/lib/api/types";
import { indexarCatalogo } from "@/lib/catalogo-config";
import {
  alternarOpcion,
  cambiosDe,
  cuerpoDeAplicar,
  cuerpoDeVistaPrevia,
  describirCambio,
  elegidasDe,
  elegirUna,
  esPasoDePregunta,
  guardarAvance,
  hayRespuestas,
  ID_PASO_REVISAR,
  leerAvance,
  MENSAJE_DE_VISTA_VENCIDA,
  olvidarAvance,
  omitidosDe,
  pasoDeLaPregunta,
  pasosDelGuion,
  quitarRespuesta,
  type Respuestas,
} from "@/lib/configuracion-asistente";
import { MENSAJE_SESION_TERMINADA, useAction } from "@/lib/use-action";

type EstadoDeLaVista = "reposo" | "cargando" | "lista" | "error";
type RespuestaDeApi = { error?: string; code?: string; fields?: Record<string, string> };

/** El mensaje del BFF si es texto; lo demás (un objeto inesperado) no se pinta, rompería la pantalla. */
const mensajeDe = (json: RespuestaDeApi, respaldo: string) =>
  typeof json.error === "string" && json.error ? json.error : respaldo;

/**
 * Asistente por preguntas de Configuración (HU-CFG-11, ADR-0182): una pregunta por pantalla y, al final,
 * la vista previa de lo que cambiaría. El guion, las ayudas y el cálculo vienen del backend; aquí solo se
 * recogen respuestas y se muestra el resultado. Aplicar es todo o nada, con la huella de la vista previa
 * que se vio: si la configuración cambió en medio, se avisa y se recalcula sin perder las respuestas.
 *
 * Una pregunta sin responder no cambia nada. Cerrar sin aplicar tampoco: solo queda el avance en este
 * navegador para retomarlo.
 */
export function AsistenteDeConfiguracion({
  guion,
  catalogo,
  hayCambiosSinGuardar,
  onDescartar,
  onAplicado,
}: {
  guion: GuionAsistente;
  catalogo: CatalogoConfig | null;
  /** El formulario manual tiene cambios sin guardar: el asistente parte de lo guardado, no de eso. */
  hayCambiosSinGuardar: boolean;
  /** Deja el formulario como está guardado (se llama si la persona acepta perder lo que no guardó). */
  onDescartar: () => void;
  /** El servidor aplicó la propuesta: el formulario manual debe mostrar ya el resultado. */
  onAplicado: (propuesta: PropuestaAsistente) => void;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);
  const pasos = useMemo(() => pasosDelGuion(guion), [guion]);
  const ultimaPregunta = pasos.length - 2;

  const [abierto, setAbierto] = useState(false);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [paso, setPaso] = useState(0);
  const [retomado, setRetomado] = useState(false);
  const [vista, setVista] = useState<EstadoDeLaVista>("reposo");
  const [propuesta, setPropuesta] = useState<PropuestaAsistente | null>(null);
  const [errorDeVista, setErrorDeVista] = useState("");
  const [errorDePaso, setErrorDePaso] = useState<{ paso: number; mensaje: string } | null>(null);
  const [vencida, setVencida] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const primeraVez = useRef(true);
  // Cada pedido de vista previa lleva un número: si llega tarde uno viejo (la persona volvió o cerró), se ignora.
  const pedido = useRef(0);

  const actual = pasos[Math.min(paso, pasos.length - 1)];
  const enRevision = actual.id === ID_PASO_REVISAR;

  async function abrir() {
    if (hayCambiosSinGuardar) {
      const seguir = await confirm({
        title: "Tienes cambios sin guardar",
        description:
          "El asistente parte de lo que ya está guardado, no de lo que estás editando. Si sigues, se pierden los cambios sin guardar de este formulario.",
        confirmLabel: "Descartar y abrir",
        cancelLabel: "Seguir editando",
        destructive: true,
      });
      if (!seguir) return;
      onDescartar();
    }
    const guardado = leerAvance(guion.seccion, guion);
    pedido.current += 1;
    primeraVez.current = true;
    setRespuestas(guardado?.respuestas ?? {});
    setPaso(guardado?.paso ?? 0);
    setRetomado(guardado !== null);
    setVista("reposo");
    setPropuesta(null);
    setErrorDeVista("");
    setErrorDePaso(null);
    setVencida(false);
    setAbierto(true);
  }

  function cerrar() {
    pedido.current += 1;
    setAbierto(false);
  }

  /** Lleva el foco al título del paso nuevo: el lector de pantalla anuncia dónde quedó. */
  function enfocarTitulo() {
    // Espera al render del paso nuevo.
    queueMicrotask(() => titulo.current?.focus());
  }

  function irA(i: number, siguientes: Respuestas = respuestas) {
    setPaso(i);
    setErrorDePaso(null);
    setVencida(false);
    guardarAvance(guion.seccion, siguientes, Math.min(i, ultimaPregunta));
    enfocarTitulo();
    if (pasos[i].id === ID_PASO_REVISAR) void pedirVistaPrevia(siguientes);
  }

  function cambiar(siguientes: Respuestas) {
    setRespuestas(siguientes);
    setErrorDePaso(null);
    setRetomado(false);
    guardarAvance(guion.seccion, siguientes, Math.min(paso, ultimaPregunta));
  }

  /** Un 422 trae un mensaje por pregunta: se salta al paso de la primera y se deja el mensaje ahí. */
  function marcarErrores(campos: Record<string, string>): string {
    for (const [campo, mensaje] of Object.entries(campos)) {
      const destino = pasoDeLaPregunta(campo, pasos);
      if (destino !== null) {
        setPaso(destino);
        setErrorDePaso({ paso: destino, mensaje });
        enfocarTitulo();
        return mensaje;
      }
    }
    return Object.values(campos)[0] ?? "Revisa las respuestas.";
  }

  async function pedirVistaPrevia(r: Respuestas) {
    const mio = ++pedido.current;
    setPropuesta(null);
    setErrorDeVista("");
    if (!hayRespuestas(r)) {
      setVista("lista");
      return;
    }
    setVista("cargando");
    let res: Response;
    try {
      res = await fetch(`/api/settings/asistente/${guion.seccion}/vista-previa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDeVistaPrevia(guion, r)),
      });
    } catch {
      if (mio !== pedido.current) return;
      setVista("error");
      setErrorDeVista("No se pudo contactar el servidor.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as RespuestaDeApi & Partial<PropuestaAsistente>;
    if (mio !== pedido.current) return;
    if (res.ok) {
      setPropuesta(json as PropuestaAsistente);
      setVista("lista");
      return;
    }
    if (res.status === 422 && json.fields) {
      marcarErrores(json.fields);
      setVista("reposo");
      return;
    }
    setVista("error");
    setErrorDeVista(res.status === 401 ? MENSAJE_SESION_TERMINADA : mensajeDe(json, "No se pudo calcular los cambios."));
  }

  async function aplicar() {
    if (!propuesta) return;
    const huella = propuesta.huella;
    const aplicada = await run(async () => {
      const res = await fetch(`/api/settings/asistente/${guion.seccion}/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDeAplicar(guion, respuestas, huella)),
      });
      const json = (await res.json().catch(() => ({}))) as RespuestaDeApi & Partial<PropuestaAsistente>;
      if (!res.ok) {
        if (res.status === 409) {
          // La configuración (o el agente) cambió desde la vista previa: nada se escribió. Se recalcula con
          // las mismas respuestas para que la persona vea lo nuevo antes de decidir otra vez.
          setVencida(true);
          void pedirVistaPrevia(respuestas);
          return { ok: false, status: 409, error: MENSAJE_DE_VISTA_VENCIDA };
        }
        if (res.status === 422 && json.fields) {
          return { ok: false, status: 422, error: marcarErrores(json.fields) };
        }
        return { ok: false, status: res.status, error: mensajeDe(json, "No se pudieron aplicar los cambios.") };
      }
      olvidarAvance(guion.seccion);
      onAplicado(Array.isArray(json.cambios) ? (json as PropuestaAsistente) : propuesta);
      return { ok: true, success: "Listo: ajustamos tu configuración. Revisa el formulario y afina lo que quieras." };
    });
    if (aplicada) cerrar();
  }

  function empezarDeNuevo() {
    olvidarAvance(guion.seccion);
    setRespuestas({});
    setRetomado(false);
    irA(0, {});
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-headline">{guion.titulo}</p>
          <p className="text-sm text-body">
            {guion.ayuda || "Responde unas preguntas y dejamos un ajuste inicial. Después lo afinas a mano aquí abajo."}
          </p>
        </div>
        <Button ref={boton} type="button" variant="outline" onClick={() => void abrir()} className="shrink-0">
          <Sparkles aria-hidden className="h-4 w-4" />
          Ajustar con preguntas
        </Button>
      </div>

      <Sheet open={abierto} onOpenChange={(valor) => (valor ? setAbierto(true) : cerrar())}>
        {abierto && (
          <SheetContent
            title={guion.titulo}
            description="Responde lo que quieras: lo que dejes sin responder se queda como está. Antes de aplicar, revisas todo."
            onOpenAutoFocus={(evento) => {
              evento.preventDefault();
              titulo.current?.focus();
            }}
            onCloseAutoFocus={(evento) => {
              evento.preventDefault();
              boton.current?.focus();
            }}
            footer={
              <>
                {paso > 0 && (
                  <Button type="button" variant="outline" onClick={() => irA(paso - 1)} disabled={pending}>
                    {enRevision ? "Volver" : "Atrás"}
                  </Button>
                )}
                {enRevision ? (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => void aplicar()}
                    loading={pending}
                    disabled={pending || vista !== "lista" || cambiosDe(propuesta).length === 0}
                  >
                    Aplicar cambios
                  </Button>
                ) : (
                  <Button type="button" variant="accent" onClick={() => irA(paso + 1)}>
                    {paso === ultimaPregunta ? "Ver los cambios" : "Siguiente"}
                  </Button>
                )}
              </>
            }
          >
            <div className="flex flex-col gap-5">
              {retomado && paso > 0 && (
                <p role="status" className="text-sm text-body">
                  Retomamos donde lo dejaste.{" "}
                  <button type="button" className="text-link underline" onClick={empezarDeNuevo}>
                    Empezar de nuevo
                  </button>
                </p>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-soft" aria-live="polite">
                  {textoDeAvance(paso, pasos.length)}
                </p>
                <Progress
                  value={paso + 1}
                  max={pasos.length}
                  label="Avance del asistente"
                  valueText={textoDeAvance(paso, pasos.length)}
                  size="sm"
                />
              </div>

              <h3
                ref={titulo}
                tabIndex={-1}
                className="font-display text-lg font-semibold text-headline outline-none"
              >
                {actual.titulo}
              </h3>

              {esPasoDePregunta(actual) ? (
                <PasoDePregunta
                  pregunta={actual.pregunta}
                  respuestas={respuestas}
                  onCambiar={cambiar}
                  error={errorDePaso?.paso === paso ? errorDePaso.mensaje : undefined}
                />
              ) : (
                <Revision
                  hayRespuestas={hayRespuestas(respuestas)}
                  vista={vista}
                  propuesta={propuesta}
                  errorDeVista={errorDeVista}
                  vencida={vencida}
                  onReintentar={() => void pedirVistaPrevia(respuestas)}
                  indice={indice}
                />
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}

/** Una pregunta: opciones de un clic con su ayuda, y «Dejar como está» para no cambiar nada. */
function PasoDePregunta({
  pregunta,
  respuestas,
  onCambiar,
  error,
}: {
  pregunta: PreguntaAsistente;
  respuestas: Respuestas;
  onCambiar: (siguientes: Respuestas) => void;
  error?: string;
}) {
  const elegidas = elegidasDe(respuestas, pregunta);
  const respondida = pregunta.id in respuestas;
  return (
    <div className="flex flex-col gap-3">
      {pregunta.ayuda && <p className="text-sm text-body">{pregunta.ayuda}</p>}
      {pregunta.tipo === "una" ? (
        <RadioGroup
          label={pregunta.titulo}
          name={`asistente-${pregunta.id}`}
          value={elegidas[0] ?? ""}
          onValueChange={(opcionId) => onCambiar(elegirUna(respuestas, pregunta, opcionId))}
          options={pregunta.opciones.map((o) => ({ value: o.id, label: o.titulo, description: o.ayuda || undefined }))}
        />
      ) : (
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="sr-only">{pregunta.titulo}</legend>
          {pregunta.opciones.map((o) => (
            <div key={o.id} className="flex flex-col gap-0.5">
              <Checkbox
                id={`asistente-${pregunta.id}-${o.id}`}
                label={o.titulo}
                checked={elegidas.includes(o.id)}
                onCheckedChange={(marcada) => onCambiar(alternarOpcion(respuestas, pregunta, o.id, marcada))}
              />
              {o.ayuda && <p className="pl-6 text-xs text-text-soft">{o.ayuda}</p>}
            </div>
          ))}
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      )}
      <p className="text-xs text-text-soft">
        {respondida ? (
          <>
            ¿Prefieres no cambiar esto?{" "}
            <button type="button" className="text-link underline" onClick={() => onCambiar(quitarRespuesta(respuestas, pregunta.id))}>
              Dejar como está
            </button>
          </>
        ) : (
          "Si no eliges nada, esto se queda como está."
        )}
      </p>
    </div>
  );
}

/** Último paso: cada cambio con el valor de hoy y el propuesto, lo que no se cambiará y por qué. */
function Revision({
  hayRespuestas: conRespuestas,
  vista,
  propuesta,
  errorDeVista,
  vencida,
  onReintentar,
  indice,
}: {
  hayRespuestas: boolean;
  vista: EstadoDeLaVista;
  propuesta: PropuestaAsistente | null;
  errorDeVista: string;
  vencida: boolean;
  onReintentar: () => void;
  indice: ReturnType<typeof indexarCatalogo>;
}) {
  if (!conRespuestas) {
    return <p className="text-sm text-body">No respondiste ninguna pregunta, así que no hay nada que cambiar. Vuelve y elige lo que quieras ajustar.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {vencida && (
        <p role="alert" className="rounded-md border border-border bg-status-warning-bg p-3 text-sm text-status-warning-fg">
          {MENSAJE_DE_VISTA_VENCIDA} No se aplicó nada; abajo está lo que cambiaría ahora.
        </p>
      )}
      {vista === "cargando" && (
        <p role="status" className="text-sm text-text-soft">
          Calculando los cambios…
        </p>
      )}
      {vista === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-status-danger-fg">
            {errorDeVista}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {vista === "lista" && propuesta && (
        <>
          {cambiosDe(propuesta).length === 0 ? (
            <p className="text-sm text-body">Con estas respuestas no cambia nada: tu configuración ya está así.</p>
          ) : (
            <>
              <p className="text-sm text-body">
                Esto es lo que cambiaría. Se aplica todo junto o no se aplica nada; después puedes afinar cada campo en el formulario.
              </p>
              <ul aria-label="Cambios propuestos" className="flex flex-col gap-3">
                {cambiosDe(propuesta).map((cambio) => {
                  const c = describirCambio(cambio, indice);
                  return (
                    <li key={c.clave} className="flex flex-col gap-1.5 rounded-md border border-border-soft p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-headline">{c.etiqueta}</p>
                        {c.editadoAMano && <Badge variant="warning">Lo cambiaste a mano</Badge>}
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt className="text-text-soft">Ahora</dt>
                        <dd className="min-w-0 break-words text-body">{c.actual}</dd>
                        <dt className="flex items-center gap-1 text-text-soft">
                          <ArrowRight aria-hidden className="h-3 w-3" />
                          Quedaría
                        </dt>
                        <dd className="min-w-0 break-words font-medium text-headline">{c.propuesto}</dd>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {omitidosDe(propuesta).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-headline">Esto no se cambiará</p>
              <ul aria-label="Cambios que no se harán" className="flex flex-col gap-1 text-sm text-body">
                {omitidosDe(propuesta).map((o) => (
                  <li key={o.clave}>
                    <span className="text-headline">{o.etiqueta}:</span> {o.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
