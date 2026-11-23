"use client";

import { useId, useState } from "react";
import { KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  erroresGenerales,
  erroresPorFila,
  esSensible,
  headerVacio,
  secretoSugerido,
  toolDesdeApi,
  toolsParaApi,
  toolVacia,
  type HeaderForm,
  type ToolForm,
  type ToolsHttpDelAgente,
} from "@/lib/reglas-y-tools-del-agente";
import { toast } from "@/lib/toast-store";

const MAX_TOOLS = 50;

/**
 * «Tools HTTP» en Personalizar › Habilidades (HU-AOS-97): consultas a los sistemas del negocio sin código. Las
 * credenciales nunca se escriben en un header: van como secreto, que se guarda cifrado en el negocio y solo viaja a
 * los dominios de la tool. Un secreto en la URL o en el cuerpo se guarda, pero el agente no ofrece esa tool (aviso).
 */
export function ToolsHttpDelAgenteEditable({
  agenteId,
  inicial,
  lockVersion,
  onGuardado,
  puedeEditar,
}: {
  agenteId: string;
  inicial: ToolsHttpDelAgente;
  lockVersion: number;
  /** El `lock_version` nuevo y las tools tal como quedaron en el borrador. */
  onGuardado: (lock: number, tools: Record<string, unknown>[]) => void;
  puedeEditar: boolean;
}) {
  const id = useId();
  const [respuesta, setRespuesta] = useState(inicial);
  const [guardadas, setGuardadas] = useState(() => inicial.tools.map(toolDesdeApi));
  const [tools, setTools] = useState<ToolForm[]>(guardadas);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string> | undefined>();
  const sinCambios = JSON.stringify(tools) === JSON.stringify(guardadas);
  const porFila = erroresPorFila(campos, "declarativeTools");
  const deshabilitado = !puedeEditar || guardando;
  const omitidas = new Set(respuesta.omitted);

  function cambiar(i: number, cambio: Partial<ToolForm>) {
    setTools((ts) => ts.map((t, k) => (k === i ? { ...t, ...cambio } : t)));
  }

  function cambiarHeader(i: number, j: number, cambio: Partial<HeaderForm>) {
    setTools((ts) =>
      ts.map((t, k) => {
        if (k !== i) return t;
        const headers = t.headers.map((h, n) => {
          if (n !== j) return h;
          const nuevo = { ...h, ...cambio };
          // Un header sensible siempre va como secreto (el contrato rechaza el texto).
          if (esSensible(nuevo.nombre) && nuevo.tipo === "texto") {
            return { ...nuevo, tipo: "secreto" as const, valor: "", secreto: nuevo.secreto || secretoSugerido(t.name) };
          }
          return nuevo;
        });
        return { ...t, headers };
      }),
    );
  }

  async function guardar() {
    let cuerpo: ReturnType<typeof toolsParaApi>;
    try {
      cuerpo = toolsParaApi(tools);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revisa las tools.");
      return;
    }
    setError(null);
    setCampos(undefined);
    setGuardando(true);
    try {
      const res = await fetch(`/api/agent-editor/${agenteId}/declarative-tools`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...cuerpo, lock_version: lockVersion }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setCampos(json?.fields);
        setError(
          json?.code === "stale_lock_version"
            ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
            : typeof json?.error === "string"
              ? json.error
              : "No pudimos guardar las tools. Inténtalo de nuevo.",
        );
        return;
      }
      const nuevo = json as ToolsHttpDelAgente;
      const formas = nuevo.tools.map(toolDesdeApi);
      setRespuesta(nuevo);
      setGuardadas(formas);
      setTools(formas);
      onGuardado(nuevo.lock_version, nuevo.tools as unknown as Record<string, unknown>[]);
      if (nuevo.omitted.length > 0) {
        toast.success("Tools guardadas, pero algunas no se ofrecerán: revisa el aviso.");
      } else {
        toast.success("Tools guardadas. Entran con la próxima publicación.");
      }
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <p className="text-sm text-text-soft">
        Consultas a tus sistemas (pedidos, inventario, envíos) que este agente puede hacer. Las credenciales van como
        secreto: se guardan cifradas y solo viajan a los dominios que permitas.
      </p>
      {respuesta.secrets.length > 0 && (
        <p className="text-sm text-body">
          Secretos guardados en tu negocio:{" "}
          {respuesta.secrets.map((s) => `${s.name} (${s.domains.join(", ")})`).join(" · ")}.
        </p>
      )}
      <datalist id={`${id}-secretos`}>
        {respuesta.secrets.map((s) => (
          <option key={s.name} value={s.name} />
        ))}
      </datalist>
      {tools.length === 0 && <p className="text-sm text-body">Este agente aún no tiene tools HTTP.</p>}
      <ol className="flex flex-col gap-4">
        {tools.map((t, i) => {
          const errores = porFila.get(i);
          const omitida = omitidas.has(t.name) && JSON.stringify(t) === JSON.stringify(guardadas[i]);
          return (
            <li key={i} className="flex flex-col gap-3 rounded-md border border-border-soft bg-surface p-3">
              {omitida && (
                <p role="status" className="flex items-start gap-2 rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  Esta tool usa un secreto en la URL o en el cuerpo: el agente no la ofrecerá. Pásalo a un header.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" htmlFor={`${id}-t${i}-nombre`} help="Letras, números y _.">
                  <Input
                    id={`${id}-t${i}-nombre`}
                    value={t.name}
                    maxLength={60}
                    placeholder="consultar_envio"
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { name: e.target.value })}
                  />
                </Field>
                <Field label="Método" htmlFor={`${id}-t${i}-metodo`}>
                  <Select
                    id={`${id}-t${i}-metodo`}
                    value={t.method}
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { method: e.target.value as ToolForm["method"] })}
                  >
                    <option value="GET">GET (consultar)</option>
                    <option value="POST">POST (enviar)</option>
                  </Select>
                </Field>
              </div>
              <Field label="Para qué sirve" htmlFor={`${id}-t${i}-descripcion`} help="El agente la usa según esta descripción.">
                <Input
                  id={`${id}-t${i}-descripcion`}
                  value={t.description}
                  maxLength={400}
                  placeholder="Estado de una guía de la transportadora"
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(i, { description: e.target.value })}
                />
              </Field>
              <Field label="URL" htmlFor={`${id}-t${i}-url`} help="Con {argumento} para lo que pide el agente.">
                <Input
                  id={`${id}-t${i}-url`}
                  value={t.url}
                  maxLength={2000}
                  placeholder="https://api.tu-sistema.com/v1/guias/{guia}"
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(i, { url: e.target.value })}
                />
              </Field>
              <Field
                label="Dominios permitidos"
                htmlFor={`${id}-t${i}-dominios`}
                help="Separados por comas. Solo dominios públicos: ni IPs ni nombres internos."
              >
                <Input
                  id={`${id}-t${i}-dominios`}
                  value={t.dominios}
                  placeholder="api.tu-sistema.com"
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(i, { dominios: e.target.value })}
                />
              </Field>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm text-headline">Headers</legend>
                {t.headers.map((h, j) => (
                  <div key={j} className="flex flex-col gap-2 rounded-md border border-border-soft p-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <Field label="Nombre" htmlFor={`${id}-t${i}-h${j}-nombre`} className="sm:w-44">
                      <Input
                        id={`${id}-t${i}-h${j}-nombre`}
                        value={h.nombre}
                        placeholder="Authorization"
                        disabled={deshabilitado}
                        onChange={(e) => cambiarHeader(i, j, { nombre: e.target.value })}
                      />
                    </Field>
                    <Field label="Va como" htmlFor={`${id}-t${i}-h${j}-tipo`} className="sm:w-36">
                      <Select
                        id={`${id}-t${i}-h${j}-tipo`}
                        value={h.tipo}
                        disabled={deshabilitado || esSensible(h.nombre)}
                        onChange={(e) =>
                          cambiarHeader(i, j, {
                            tipo: e.target.value as HeaderForm["tipo"],
                            secreto: h.secreto || secretoSugerido(t.name),
                          })
                        }
                      >
                        <option value="texto">Texto</option>
                        <option value="secreto">Secreto</option>
                      </Select>
                    </Field>
                    {h.tipo === "texto" ? (
                      <Field label="Valor" htmlFor={`${id}-t${i}-h${j}-valor`} className="sm:flex-1">
                        <Input
                          id={`${id}-t${i}-h${j}-valor`}
                          value={h.valor}
                          disabled={deshabilitado}
                          onChange={(e) => cambiarHeader(i, j, { valor: e.target.value })}
                        />
                      </Field>
                    ) : (
                      <>
                        <Field label="Secreto" htmlFor={`${id}-t${i}-h${j}-secreto`} className="sm:w-48">
                          <Input
                            id={`${id}-t${i}-h${j}-secreto`}
                            list={`${id}-secretos`}
                            value={h.secreto}
                            maxLength={60}
                            disabled={deshabilitado}
                            onChange={(e) => cambiarHeader(i, j, { secreto: e.target.value })}
                          />
                        </Field>
                        <Field
                          label="Valor nuevo"
                          htmlFor={`${id}-t${i}-h${j}-valor-secreto`}
                          help={
                            respuesta.secrets.some((s) => s.name === h.secreto)
                              ? "Ya guardado: déjalo vacío para usarlo, o escribe uno para cambiarlo."
                              : "Se guarda cifrado; no se vuelve a mostrar."
                          }
                          className="sm:flex-1"
                        >
                          <InputPassword
                            id={`${id}-t${i}-h${j}-valor-secreto`}
                            value={h.valorSecreto}
                            autoComplete="off"
                            disabled={deshabilitado}
                            onChange={(e) => cambiarHeader(i, j, { valorSecreto: e.target.value })}
                          />
                        </Field>
                      </>
                    )}
                    {puedeEditar && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11"
                        disabled={guardando}
                        aria-label={`Quitar el header ${j + 1} de la tool ${i + 1}`}
                        onClick={() => cambiar(i, { headers: t.headers.filter((_, n) => n !== j) })}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {puedeEditar && (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11"
                      disabled={guardando || t.headers.length >= 30}
                      onClick={() => cambiar(i, { headers: [...t.headers, headerVacio()] })}
                    >
                      <KeyRound aria-hidden className="size-4" /> Agregar header
                    </Button>
                  </div>
                )}
              </fieldset>

              <details className="text-sm">
                <summary className="cursor-pointer text-link">Parámetros y cuerpo (JSON)</summary>
                <div className="mt-2 flex flex-col gap-3">
                  <Field label="Parámetros (JSON Schema)" htmlFor={`${id}-t${i}-parametros`}>
                    <Textarea
                      id={`${id}-t${i}-parametros`}
                      value={t.parameters}
                      className="font-mono text-xs"
                      disabled={deshabilitado}
                      onChange={(e) => cambiar(i, { parameters: e.target.value })}
                    />
                  </Field>
                  {t.method === "POST" && (
                    <Field label="Cuerpo (JSON)" htmlFor={`${id}-t${i}-cuerpo`}>
                      <Textarea
                        id={`${id}-t${i}-cuerpo`}
                        value={t.body}
                        className="font-mono text-xs"
                        disabled={deshabilitado}
                        onChange={(e) => cambiar(i, { body: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
              </details>

              {errores && <FormFeedback error={errores.join(" ")} />}
              {puedeEditar && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    disabled={guardando}
                    aria-label={`Quitar la tool ${i + 1}`}
                    onClick={() => setTools((ts) => ts.filter((_, k) => k !== i))}
                  >
                    <Trash2 aria-hidden className="size-4" /> Quitar tool
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <FormFeedback error={[error, ...erroresGenerales(campos, "declarativeTools")].filter(Boolean).join(" ") || null} />
      {puedeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={guardando || tools.length >= MAX_TOOLS}
            onClick={() => setTools((ts) => [...ts, toolVacia()])}
          >
            <Plus aria-hidden className="size-4" /> Agregar tool
          </Button>
          <Button type="button" className="min-h-11" loading={guardando} disabled={sinCambios} onClick={() => void guardar()}>
            Guardar tools
          </Button>
        </div>
      )}
    </section>
  );
}
