"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionesAccion, OpcionesAccionDelCatalogo, OpcionesHallazgo, OpcionesVariable } from "@/lib/api/types";
import { apuntaA, hallazgosDe, sinArgumento, sinVacios } from "@/lib/plantillas-opciones";
import {
  leerJson,
  leerObjetoJson,
  planDeFormulario,
  textoAValor,
  valorATexto,
  type Campo,
} from "@/lib/plantillas-opciones-formulario";

import { MensajesDeCampo } from "./mensajes-de-campo";

type ReportarError = (clave: string, mensaje: string | null) => void;

const mismoValor = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Formulario de `args_fijos` generado desde el JSON Schema de la tool elegida (HU-OPC-06). Cada argumento
 * se marca como «valor fijo» (lo escribe el dueño) o «dato del contexto» (lo arma el servidor desde la
 * conversación): nunca sale del texto del cliente. Un schema que no sabe pintar cae a un editor JSON validado.
 */
export function FormularioArgumentos({
  ficha,
  accion,
  variables,
  onChange,
  disabled,
  base,
  hallazgos,
  reportarError,
  claveError,
}: {
  ficha: OpcionesAccionDelCatalogo;
  accion: OpcionesAccion;
  variables: OpcionesVariable[];
  onChange: (accion: OpcionesAccion) => void;
  disabled?: boolean;
  /** `opciones[2].accion`: de aquí cuelgan los hallazgos de los argumentos. */
  base: string;
  hallazgos: readonly OpcionesHallazgo[];
  reportarError: ReportarError;
  /** Prefijo único de la opción para registrar los errores de JSON sin guardar. */
  claveError: string;
}) {
  const idBase = useId();
  const plan = useMemo(() => planDeFormulario(ficha.parameters), [ficha.parameters]);
  const fijos = accion.args_fijos ?? {};
  const contexto = accion.args_contexto ?? {};

  if (plan.tipo === "json") {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-status-info-bg p-3 text-xs text-status-info-fg">{plan.motivo}</p>
        <EditorJsonDelConjunto
          valor={fijos}
          onValor={(args_fijos) => onChange({ ...accion, args_fijos })}
          disabled={disabled}
          clave={`${claveError}.args`}
          reportarError={reportarError}
          hallazgos={hallazgosDe(hallazgos, `${base}.args_fijos`)}
        />
        <FilasDeContexto
          contexto={contexto}
          variables={variables}
          disabled={disabled}
          onChange={(args_contexto) => onChange({ ...accion, args_contexto })}
          hallazgos={hallazgosDe(hallazgos, `${base}.args_contexto`)}
        />
      </div>
    );
  }

  if (plan.campos.length === 0) {
    return <p className="text-xs text-text-soft">Esta acción no necesita argumentos.</p>;
  }

  const consumidos = plan.campos.flatMap((c) => [`${base}.args_fijos.${c.nombre}`, `${base}.args_contexto.${c.nombre}`]);
  const sueltos = hallazgos.filter(
    (h) => (apuntaA(h.path, `${base}.args_fijos`) || apuntaA(h.path, `${base}.args_contexto`)) && !consumidos.some((d) => apuntaA(h.path, d)),
  );

  function pasarAContexto(nombre: string) {
    const sin = sinArgumento(accion, nombre);
    onChange({ ...sin, args_contexto: { ...sin.args_contexto, [nombre]: "" } });
  }
  function pasarAFijo(nombre: string) {
    onChange(sinArgumento(accion, nombre));
  }
  function fijar(nombre: string, valor: unknown) {
    const args_fijos = { ...fijos };
    const limpio = sinVacios(valor);
    if (limpio === undefined) delete args_fijos[nombre];
    else args_fijos[nombre] = limpio;
    onChange({ ...accion, args_fijos });
  }

  return (
    <div className="flex flex-col gap-3">
      {plan.campos.map((campo) => {
        const enContexto = campo.nombre in contexto;
        const id = `${idBase}-${campo.nombre}`;
        const mensajes = hallazgosDe(hallazgos, `${base}.args_fijos.${campo.nombre}`, `${base}.args_contexto.${campo.nombre}`);
        return (
          <div key={campo.nombre} data-argumento={campo.nombre} className="flex flex-col gap-2 rounded-md border border-border-soft p-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              {campo.tipo === "grupo" ? (
                <span className="text-[13px] font-medium text-body">
                  {campo.titulo}
                  {campo.requerido && <span className="text-status-danger-fg"> *<span className="sr-only">(obligatorio)</span></span>}
                </span>
              ) : (
                <label htmlFor={id} className="text-[13px] font-medium text-body">
                  {campo.titulo}
                  {campo.requerido && <span className="text-status-danger-fg"> *<span className="sr-only">(obligatorio)</span></span>}
                </label>
              )}
              <span className="flex items-center gap-2 text-xs text-text-soft">
                <span aria-hidden>{enContexto ? "Dato del contexto" : "Valor fijo"}</span>
                <Switch
                  checked={enContexto}
                  disabled={disabled}
                  aria-label={`${campo.titulo}: tomar el valor de un dato del contexto en vez de un valor fijo`}
                  onCheckedChange={(v) => (v ? pasarAContexto(campo.nombre) : pasarAFijo(campo.nombre))}
                />
              </span>
            </div>
            {campo.ayuda && <p className="text-xs text-text-soft">{campo.ayuda}</p>}
            {enContexto ? (
              <SelectorDeVariable
                id={id}
                value={contexto[campo.nombre] ?? ""}
                variables={variables}
                disabled={disabled}
                onChange={(ruta) => onChange({ ...accion, args_contexto: { ...contexto, [campo.nombre]: ruta } })}
              />
            ) : (
              <ControlDeCampo
                campo={campo}
                valor={fijos[campo.nombre]}
                onValor={(v) => fijar(campo.nombre, v)}
                id={id}
                disabled={disabled}
                clave={`${claveError}.${campo.nombre}`}
                reportarError={reportarError}
              />
            )}
            <MensajesDeCampo hallazgos={mensajes} />
          </div>
        );
      })}
      <MensajesDeCampo hallazgos={sueltos} />
    </div>
  );
}

function SelectorDeVariable({
  id,
  value,
  variables,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  variables: OpcionesVariable[];
  onChange: (ruta: string) => void;
  disabled?: boolean;
}) {
  const conocida = !value || variables.some((v) => v.ruta === value);
  return (
    <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-invalid={!value || !conocida || undefined}>
      <option value="">Elige el dato…</option>
      {variables.map((v) => (
        <option key={v.ruta} value={v.ruta}>
          {v.descripcion} ({v.ruta})
        </option>
      ))}
      {!conocida && <option value={value}>{value} (ya no está disponible)</option>}
    </Select>
  );
}

/** El control de un valor fijo, según el tipo del campo. Los grupos se pintan anidados. */
function ControlDeCampo({
  campo,
  valor,
  onValor,
  id,
  disabled,
  clave,
  reportarError,
}: {
  campo: Campo;
  valor: unknown;
  onValor: (valor: unknown) => void;
  id: string;
  disabled?: boolean;
  clave: string;
  reportarError: ReportarError;
}) {
  switch (campo.tipo) {
    case "texto":
      return (
        <Input
          id={id}
          value={valor === undefined || valor === null ? "" : String(valor)}
          maxLength={campo.maxLength}
          disabled={disabled}
          onChange={(e) => onValor(textoAValor(campo, e.target.value))}
        />
      );
    case "textoLargo":
      return (
        <Textarea
          id={id}
          rows={3}
          value={valor === undefined || valor === null ? "" : String(valor)}
          maxLength={campo.maxLength}
          disabled={disabled}
          onChange={(e) => onValor(textoAValor(campo, e.target.value))}
        />
      );
    case "numero":
    case "entero":
      return (
        <CampoConTexto campo={campo} valor={valor} onValor={onValor}>
          {(texto, cambiar) => (
            <Input
              id={id}
              type="number"
              inputMode="decimal"
              step={campo.tipo === "entero" ? 1 : "any"}
              min={campo.min}
              max={campo.max}
              value={texto}
              disabled={disabled}
              onChange={(e) => cambiar(e.target.value)}
            />
          )}
        </CampoConTexto>
      );
    case "lista":
      return (
        <CampoConTexto campo={campo} valor={valor} onValor={onValor}>
          {(texto, cambiar) => (
            <Textarea
              id={id}
              rows={3}
              placeholder="Una por línea"
              value={texto}
              disabled={disabled}
              onChange={(e) => cambiar(e.target.value)}
            />
          )}
        </CampoConTexto>
      );
    case "booleano":
      return (
        <Select
          id={id}
          value={valor === true ? "si" : valor === false ? "no" : ""}
          disabled={disabled}
          onChange={(e) => onValor(e.target.value === "si" ? true : e.target.value === "no" ? false : undefined)}
        >
          <option value="">{campo.requerido ? "Elige…" : "Sin definir"}</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </Select>
      );
    case "elegir": {
      const actual = campo.opciones.findIndex((o) => mismoValor(o.valor, valor));
      return (
        <Select
          id={id}
          value={actual >= 0 ? String(actual) : ""}
          disabled={disabled}
          onChange={(e) => onValor(e.target.value === "" ? undefined : campo.opciones[Number(e.target.value)].valor)}
        >
          <option value="">{campo.requerido ? "Elige una opción…" : "Sin definir"}</option>
          {campo.opciones.map((o, i) => (
            <option key={i} value={String(i)}>
              {o.etiqueta}
            </option>
          ))}
        </Select>
      );
    }
    case "grupo": {
      const actual = valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
      return (
        <div className="flex flex-col gap-3 border-l-2 border-border-soft pl-3">
          {campo.campos.map((sub) => (
            <div key={sub.nombre} className="flex flex-col gap-1.5">
              {sub.tipo === "grupo" ? (
                <span className="text-xs font-medium text-body">{sub.titulo}</span>
              ) : (
                <label htmlFor={`${id}-${sub.nombre}`} className="text-xs font-medium text-body">
                  {sub.titulo}
                  {sub.requerido && <span className="text-status-danger-fg"> *</span>}
                </label>
              )}
              {sub.ayuda && <p className="text-xs text-text-soft">{sub.ayuda}</p>}
              <ControlDeCampo
                campo={sub}
                valor={actual[sub.nombre]}
                onValor={(v) => onValor(sinVacios({ ...actual, [sub.nombre]: v }))}
                id={`${id}-${sub.nombre}`}
                disabled={disabled}
                clave={`${clave}.${sub.nombre}`}
                reportarError={reportarError}
              />
            </div>
          ))}
        </div>
      );
    }
    case "json":
      return (
        <CampoJson
          id={id}
          valor={valor}
          onValor={onValor}
          disabled={disabled}
          clave={clave}
          reportarError={reportarError}
          motivo={campo.motivo}
        />
      );
  }
}

/**
 * Conserva lo que el dueño está escribiendo (un «1.», una línea en blanco al final de la lista) y solo
 * lo reemplaza cuando el valor de afuera cambia a otra cosa.
 */
function CampoConTexto({
  campo,
  valor,
  onValor,
  children,
}: {
  campo: Campo;
  valor: unknown;
  onValor: (valor: unknown) => void;
  children: (texto: string, cambiar: (texto: string) => void) => React.ReactNode;
}) {
  const [texto, setTexto] = useState(() => valorATexto(campo, valor));
  useEffect(() => {
    // Si el valor de afuera ya no es lo que dice el texto (otra herramienta, otra plantilla), se re-sincroniza.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexto((actual) => (mismoValor(textoAValor(campo, actual), valor) ? actual : valorATexto(campo, valor)));
  }, [campo, valor]);
  return <>{children(texto, (nuevo) => (setTexto(nuevo), onValor(textoAValor(campo, nuevo))))}</>;
}

/** Un campo que el formulario no sabe pintar: JSON validado. Mientras el texto no sea JSON válido no se aplica ni se publica. */
function CampoJson({
  id,
  valor,
  onValor,
  disabled,
  clave,
  reportarError,
  motivo,
}: {
  id: string;
  valor: unknown;
  onValor: (valor: unknown) => void;
  disabled?: boolean;
  clave: string;
  reportarError: ReportarError;
  motivo: string;
}) {
  const [texto, setTexto] = useState(() => valorATexto({ tipo: "json" }, valor));
  const [invalido, setInvalido] = useState(false);
  useEffect(() => () => reportarError(clave, null), [clave, reportarError]);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-text-soft">{motivo}</p>
      <Textarea
        id={id}
        rows={4}
        spellCheck={false}
        className="font-mono text-xs"
        placeholder="{ }"
        value={texto}
        disabled={disabled}
        aria-invalid={invalido || undefined}
        onChange={(e) => {
          setTexto(e.target.value);
          const leido = leerJson(e.target.value);
          setInvalido(!leido.ok);
          reportarError(clave, leido.ok ? null : "El JSON no es válido.");
          if (leido.ok) onValor(leido.valor);
        }}
      />
      {invalido && (
        <p role="alert" className="text-xs text-status-danger-fg">
          El JSON no es válido: corrígelo para poder guardar y publicar.
        </p>
      )}
    </div>
  );
}

/** Editor de todos los argumentos fijos como un objeto JSON (cuando el schema de la tool no se pinta). */
function EditorJsonDelConjunto({
  valor,
  onValor,
  disabled,
  clave,
  reportarError,
  hallazgos,
}: {
  valor: Record<string, unknown>;
  onValor: (valor: Record<string, unknown>) => void;
  disabled?: boolean;
  clave: string;
  reportarError: ReportarError;
  hallazgos: readonly OpcionesHallazgo[];
}) {
  const id = useId();
  const [texto, setTexto] = useState(() => (Object.keys(valor).length ? JSON.stringify(valor, null, 2) : ""));
  const [motivo, setMotivo] = useState<string | null>(null);
  useEffect(() => () => reportarError(clave, null), [clave, reportarError]);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-body">
        Valores fijos (JSON)
      </label>
      <Textarea
        id={id}
        rows={5}
        spellCheck={false}
        className="font-mono text-xs"
        placeholder='{ "argumento": "valor" }'
        value={texto}
        disabled={disabled}
        aria-invalid={motivo !== null || undefined}
        onChange={(e) => {
          setTexto(e.target.value);
          const leido = leerObjetoJson(e.target.value);
          setMotivo(leido.ok ? null : leido.motivo);
          reportarError(clave, leido.ok ? null : leido.motivo);
          if (leido.ok) onValor(leido.valor);
        }}
      />
      {motivo && (
        <p role="alert" className="text-xs text-status-danger-fg">
          {motivo}
        </p>
      )}
      <MensajesDeCampo hallazgos={hallazgos} />
    </div>
  );
}

/** Argumento → dato del contexto, a mano, para cuando el formulario no conoce los argumentos de la tool. */
function FilasDeContexto({
  contexto,
  variables,
  onChange,
  disabled,
  hallazgos,
}: {
  contexto: Record<string, string>;
  variables: OpcionesVariable[];
  onChange: (contexto: Record<string, string>) => void;
  disabled?: boolean;
  hallazgos: readonly OpcionesHallazgo[];
}) {
  const idBase = useId();
  const [filas, setFilas] = useState<{ nombre: string; ruta: string }[]>(() =>
    Object.entries(contexto).map(([nombre, ruta]) => ({ nombre, ruta })),
  );
  function aplicar(siguientes: { nombre: string; ruta: string }[]) {
    setFilas(siguientes);
    onChange(Object.fromEntries(siguientes.filter((f) => f.nombre.trim()).map((f) => [f.nombre.trim(), f.ruta])));
  }
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-[13px] font-medium text-body">Datos del contexto</legend>
      <p className="text-xs text-text-soft">Argumentos que el servidor arma desde la conversación, en vez de un valor fijo.</p>
      {filas.map((fila, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={`Nombre del argumento ${i + 1}`}
            className="w-40"
            placeholder="argumento"
            value={fila.nombre}
            onChange={(e) => aplicar(filas.map((f, j) => (j === i ? { ...f, nombre: e.target.value } : f)))}
          />
          <Select
            aria-label={`Dato del contexto del argumento ${i + 1}`}
            id={`${idBase}-${i}`}
            className="min-w-48 flex-1"
            value={fila.ruta}
            onChange={(e) => aplicar(filas.map((f, j) => (j === i ? { ...f, ruta: e.target.value } : f)))}
          >
            <option value="">Elige el dato…</option>
            {variables.map((v) => (
              <option key={v.ruta} value={v.ruta}>
                {v.descripcion} ({v.ruta})
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" size="icon" aria-label={`Quitar el argumento ${i + 1}`} onClick={() => aplicar(filas.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => aplicar([...filas, { nombre: "", ruta: "" }])}>
          <Plus className="h-4 w-4" aria-hidden />
          Agregar dato del contexto
        </Button>
      </div>
      <MensajesDeCampo hallazgos={hallazgos} />
    </fieldset>
  );
}
