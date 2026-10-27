"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ShieldCheck, Trash2 } from "lucide-react";

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

/**
 * Una opción de la plantilla (HU-OPC-06): título (20 caracteres), la acción que ejecuta con su formulario de
 * argumentos, si pide confirmación y lo que responde el sistema al terminar. Los hallazgos del lint salen
 * junto al campo de su `path`.
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
}) {
  const id = useId();
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
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-headline">
            Opción {indice + 1}
            {opcion.titulo && <span className="ml-2 font-sans text-sm font-normal text-text-soft">{opcion.titulo}</span>}
          </h3>
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
        </div>

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
                {corto(a.descripcion || a.tool, 70)} · {a.tool}
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
            <p className="text-xs text-text-soft">
              Cada dato es un valor fijo que escribes aquí o un dato de la conversación que arma el servidor. Nunca sale de lo que escriba el cliente.
            </p>
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

        <ResultKeys
          valor={opcion.result_keys ?? []}
          disabled={disabled}
          onChange={(result_keys) => onChange({ ...opcion, result_keys })}
          hallazgos={mResultado}
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

        <MensajesDeCampo hallazgos={sueltos} />
      </CardContent>
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
        Datos del resultado que puedes citar (opcional)
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
        Nombres de lo que devuelve la acción, separados por coma (hasta {MAX_RESULT_KEYS}). Después aparecen como botones para citarlos arriba.
      </p>
      <MensajesDeCampo hallazgos={hallazgos} />
    </div>
  );
}
