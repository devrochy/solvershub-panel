"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OpcionesAccionDelCatalogo, OpcionesHallazgo, OpcionesOpcion, OpcionesVariable } from "@/lib/api/types";
import {
  MAX_RESPUESTA,
  MAX_RESULT_KEYS,
  MAX_TITULO,
  confirmacionFija,
  contar,
  hallazgosDe,
  hallazgosSinCampo,
} from "@/lib/plantillas-opciones";
import { cn } from "@/lib/utils";

import { FormularioArgumentos } from "./formulario-argumentos";
import { MensajesDeCampo } from "./mensajes-de-campo";
import { TextoConChips, type ChipDeTexto } from "./texto-con-chips";

function corto(texto: string, max = 90): string {
  const una = texto.replace(/\s+/g, " ").trim();
  return una.length > max ? `${una.slice(0, max - 1)}…` : una;
}

/** «Confirma la próxima cita · pide confirmación · responde «Listo…»»: la opción plegada en una línea (PLA-01). */
function resumenDeOpcion(opcion: OpcionesOpcion, ficha: OpcionesAccionDelCatalogo | undefined, variables: OpcionesVariable[]): string {
  const partes = [ficha ? corto(ficha.descripcion || ficha.tool, 60) : "Todavía no elegiste qué hace"];
  if (opcion.accion.confirmar) partes.push("pide confirmación");
  if (opcion.respuesta_ok.trim()) {
    const enPalabras = opcion.respuesta_ok.replace(/\{ctx\.([^{}]+)\}/g, (m, ruta: string) => variables.find((v) => v.ruta === ruta)?.descripcion ?? m);
    partes.push(`responde «${corto(enPalabras, 50)}»`);
  }
  return partes.join(" · ");
}

/**
 * Una opción de la plantilla (HU-OPC-06): título (20 caracteres), la acción que ejecuta con su formulario de
 * argumentos, si pide confirmación y lo que responde el sistema al terminar. Plegada es una fila con su resumen
 * y se abre para editarla, de a una (PLA-01). Los hallazgos del lint salen junto al campo de su `path`; con un
 * error, la fila plegada lo avisa.
 */
export function TarjetaOpcion({
  indice,
  total,
  opcion,
  acciones,
  variables,
  hallazgos,
  disabled,
  onChange,
  onMover,
  onQuitar,
  reportarError,
  abierta,
  onAlternar,
}: {
  indice: number;
  total: number;
  opcion: OpcionesOpcion;
  acciones: OpcionesAccionDelCatalogo[];
  variables: OpcionesVariable[];
  hallazgos: readonly OpcionesHallazgo[];
  disabled?: boolean;
  onChange: (opcion: OpcionesOpcion) => void;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
  reportarError: (clave: string, mensaje: string | null) => void;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const id = useId();
  const [avanzado, setAvanzado] = useState((opcion.result_keys ?? []).length > 0);
  const conErrores = hallazgos.some((h) => h.severity === "error");
  const base = `opciones[${indice}]`;
  const ficha = acciones.find((a) => a.tool === opcion.accion.tool);
  const fija = confirmacionFija(ficha);
  const sensible = Boolean(ficha?.sensible);
  const conTool = opcion.accion.tool !== "";
  const herramientaPerdida = conTool && !ficha;

  const chipsCtx: ChipDeTexto[] = variables.map((v) => ({ etiqueta: v.descripcion, texto: `{ctx.${v.ruta}}`, ayuda: `Dato del contexto: ${v.ruta}` }));
  const chipsResultado: ChipDeTexto[] = (opcion.result_keys ?? []).map((k) => ({
    etiqueta: `Resultado: ${k}`,
    texto: `{result.${k}}`,
    ayuda: "Dato que devuelve la acción",
  }));

  const mTitulo = hallazgosDe(hallazgos, `${base}.titulo`);
  const mTool = hallazgosDe(hallazgos, `${base}.accion.tool`);
  const mConfirmar = hallazgosDe(hallazgos, `${base}.accion.confirmar`);
  const mOk = hallazgosDe(hallazgos, `${base}.respuesta_ok`);
  const mError = hallazgosDe(hallazgos, `${base}.respuesta_error`);
  const mResultado = hallazgosDe(hallazgos, `${base}.result_keys`);
  const sueltos = hallazgosSinCampo(hallazgos, [
    `${base}.titulo`,
    `${base}.accion.tool`,
    `${base}.accion.confirmar`,
    `${base}.respuesta_ok`,
    `${base}.respuesta_error`,
    `${base}.result_keys`,
    `${base}.accion.args_fijos`,
    `${base}.accion.args_contexto`,
  ]);

  const titulo = contar(opcion.titulo);

  function elegirAccion(tool: string) {
    const nueva = acciones.find((a) => a.tool === tool);
    // Los argumentos son de la tool anterior: se parte de cero. La confirmación obligatoria queda activa.
    onChange({ ...opcion, accion: { tool, args_fijos: {}, args_contexto: {}, confirmar: confirmacionFija(nueva) } });
  }

  return (
    <Card data-opcion={opcion.id} aria-label={`Opción ${indice + 1}`}>
      <div className="flex items-center gap-3 p-4">
        <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-body">
          {indice + 1}
        </span>
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={`${id}-cuerpo`}
            onClick={onAlternar}
            className="flex w-full min-w-0 flex-col rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="truncate text-sm font-medium text-headline">
              <span className="sr-only">Opción {indice + 1}: </span>
              {opcion.titulo || "Sin texto todavía"}
            </span>
            {!abierta && <span className="truncate text-xs text-text-soft">{resumenDeOpcion(opcion, ficha, variables)}</span>}
          </button>
        </h3>
        {conErrores && !abierta && <Badge variant="danger">Revisar</Badge>}
        {!disabled && (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Subir la opción ${indice + 1}`} disabled={indice === 0} onClick={() => onMover(-1)}>
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Bajar la opción ${indice + 1}`} disabled={indice === total - 1} onClick={() => onMover(1)}>
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar la opción ${indice + 1}`} disabled={total <= 1} onClick={onQuitar}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )}
        <ChevronDown aria-hidden className={cn("h-4 w-4 shrink-0 text-text-soft transition-transform duration-150", abierta && "rotate-180")} />
      </div>

      {abierta && (
      <CardContent id={`${id}-cuerpo`} className="flex flex-col gap-5 border-t border-border-soft pt-5">

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-titulo`} className="text-[13px] font-medium text-body">
              Texto del botón
            </label>
            <span className={cn("text-xs tabular-nums", titulo > MAX_TITULO ? "font-medium text-status-danger-fg" : "text-text-soft")}>
              {titulo}/{MAX_TITULO}
              <span className="sr-only"> caracteres</span>
            </span>
          </div>
          <Input
            id={`${id}-titulo`}
            value={opcion.titulo}
            maxLength={MAX_TITULO}
            disabled={disabled}
            placeholder="Ej.: Confirmar cita"
            aria-invalid={mTitulo.some((h) => h.severity === "error") || undefined}
            onChange={(e) => onChange({ ...opcion, titulo: e.target.value })}
          />
          <MensajesDeCampo hallazgos={mTitulo} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-accion`} className="text-[13px] font-medium text-body">
            Qué hace al tocarla
          </label>
          <Select
            id={`${id}-accion`}
            value={opcion.accion.tool}
            disabled={disabled}
            aria-invalid={mTool.some((h) => h.severity === "error") || undefined}
            onChange={(e) => elegirAccion(e.target.value)}
          >
            <option value="">Elige una acción…</option>
            {herramientaPerdida && <option value={opcion.accion.tool}>{opcion.accion.tool} (no disponible)</option>}
            {acciones.map((a) => (
              <option key={a.tool} value={a.tool}>
                {corto(a.descripcion || a.tool, 90)}
              </option>
            ))}
          </Select>
          {ficha?.descripcion && <p className="text-xs text-text-soft">{ficha.descripcion}</p>}
          {acciones.length === 0 && (
            <p className="text-xs text-status-warning-fg">
              Tu negocio todavía no tiene acciones habilitadas para las opciones. Pide que habiliten alguna herramienta del asistente.
            </p>
          )}
          {herramientaPerdida && (
            <p className="text-xs text-status-warning-fg">Esta acción ya no está disponible en tu negocio. Elige otra para poder publicar.</p>
          )}
          {sensible && (
            <p className="mt-1">
              <Badge variant="warning">Acción sensible: siempre pide confirmación</Badge>
            </p>
          )}
          <MensajesDeCampo hallazgos={mTool} />
        </div>

        {ficha && conTool && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-body">Datos de la acción</p>
            <p className="text-xs text-text-soft">Cada dato lo escribes tú o sale de la conversación; nunca de lo que escriba el cliente.</p>
            <FormularioArgumentos
              key={ficha.tool}
              ficha={ficha}
              accion={opcion.accion}
              variables={variables}
              disabled={disabled}
              base={`${base}.accion`}
              hallazgos={hallazgos}
              reportarError={reportarError}
              claveError={`${opcion.id}.${ficha.tool}`}
              onChange={(accion) => onChange({ ...opcion, accion })}
            />
          </div>
        )}

        {conTool && (
          <div className="flex flex-col gap-1.5 rounded-md bg-surface-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <label htmlFor={`${id}-confirmar`} className="flex items-start gap-2 text-[13px] font-medium text-body">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-link" aria-hidden />
                Pedir confirmación al cliente antes de ejecutar
              </label>
              <Switch
                id={`${id}-confirmar`}
                checked={fija || opcion.accion.confirmar}
                disabled={disabled || fija}
                onCheckedChange={(confirmar) => onChange({ ...opcion, accion: { ...opcion.accion, confirmar } })}
              />
            </div>
            <p className="text-xs text-text-soft">
              {fija
                ? sensible
                  ? "No se puede quitar: es una acción sensible, así que el cliente siempre confirma con dos botones («Confirmar» y «Cancelar») antes de que se ejecute."
                  : "No se puede quitar: el permiso del asistente para esta acción exige que el cliente confirme antes de que se ejecute."
                : opcion.accion.confirmar
                  ? "El cliente verá un resumen y dos botones («Confirmar» y «Cancelar») antes de que se ejecute."
                  : "Se ejecuta apenas el cliente toca la opción."}
            </p>
            <MensajesDeCampo hallazgos={mConfirmar} />
          </div>
        )}

        <TextoConChips
          label="Qué responde si sale bien"
          value={opcion.respuesta_ok}
          onChange={(respuesta_ok) => onChange({ ...opcion, respuesta_ok })}
          max={MAX_RESPUESTA}
          rows={3}
          disabled={disabled}
          chips={[...chipsCtx, ...chipsResultado]}
          chipsLabel="Citar un dato"
          hallazgos={mOk}
          placeholder="Ej.: ¡Listo! Tu cita quedó confirmada."
          help="Es un texto fijo: el asistente no lo reescribe."
        />

        <TextoConChips
          label="Qué responde si algo falla"
          value={opcion.respuesta_error}
          onChange={(respuesta_error) => onChange({ ...opcion, respuesta_error })}
          max={MAX_RESPUESTA}
          rows={3}
          disabled={disabled}
          chips={chipsCtx}
          chipsLabel="Citar un dato"
          hallazgos={mError}
          placeholder="Ej.: No pudimos confirmarla. Te escribe una persona del equipo."
        />

        {conTool && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              aria-expanded={avanzado}
              aria-controls={`${id}-avanzado`}
              onClick={() => setAvanzado((v) => !v)}
              className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              Avanzado: datos que devuelve la acción
              <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-soft transition-transform duration-150", avanzado && "rotate-180")} />
            </button>
            {avanzado && (
              <div id={`${id}-avanzado`}>
                <ResultKeys
                  valor={opcion.result_keys ?? []}
                  disabled={disabled}
                  onChange={(result_keys) => onChange({ ...opcion, result_keys })}
                  hallazgos={mResultado}
                />
              </div>
            )}
          </div>
        )}

        <MensajesDeCampo hallazgos={sueltos} />
      </CardContent>
      )}
    </Card>
  );
}

/** Datos del resultado de la acción que se pueden citar en la respuesta: nombres separados por coma. */
function ResultKeys({
  valor,
  onChange,
  disabled,
  hallazgos,
}: {
  valor: string[];
  onChange: (valor: string[]) => void;
  disabled?: boolean;
  hallazgos: readonly OpcionesHallazgo[];
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor.join(", "));
  function aplicar(nuevo: string) {
    setTexto(nuevo);
    onChange(
      nuevo
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-body">
        Datos de la respuesta que quieres citar
      </label>
      <Input
        id={id}
        value={texto}
        disabled={disabled}
        placeholder="Ej.: numero, fecha"
        aria-invalid={hallazgos.some((h) => h.severity === "error") || undefined}
        onChange={(e) => aplicar(e.target.value)}
      />
      <p className="text-xs text-text-soft">
        Escribe sus nombres separados por coma (hasta {MAX_RESULT_KEYS}), por ejemplo «numero, fecha». Aparecen como datos para citar en «Si sale bien».
      </p>
      <MensajesDeCampo hallazgos={hallazgos} />
    </div>
  );
}
