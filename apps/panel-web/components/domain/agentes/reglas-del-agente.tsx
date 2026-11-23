"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { ListaDeFrases } from "@/components/ui/lista-de-frases";
import { Select } from "@/components/ui/select";
import {
  ACCIONES_DE_REGLA,
  erroresGenerales,
  erroresPorFila,
  problemaDeRegla,
  reglaDesdeApi,
  reglaParaApi,
  reglaVacia,
  TIPOS_DE_REGLA,
  type ReglaForm,
  type ReglasDelAgente,
  type TipoDeRegla,
} from "@/lib/reglas-y-tools-del-agente";
import { toast } from "@/lib/toast-store";

const MAX_REGLAS = 100;

/**
 * «Reglas» en Personalizar › Horario y reglas (HU-AOS-97): las reglas de respuesta de ESTE agente (frase prohibida,
 * acción obligatoria ante una frase, largo máximo), cada una con su acción si se incumple. Se guardan en el borrador y
 * entran con la próxima publicación; los demás agentes del negocio no las tienen.
 */
export function ReglasDelAgenteEditable({
  agenteId,
  inicial,
  lockVersion,
  onGuardado,
  puedeEditar,
  acciones = [],
  coordinador = false,
}: {
  agenteId: string;
  inicial: ReglasDelAgente;
  lockVersion: number;
  /** HU-AOS-98: las reglas de la recepción del Coordinador (ruta propia, sin borrador ni `lock_version`). */
  coordinador?: boolean;
  /** El `lock_version` nuevo y las reglas tal como quedaron en el borrador. */
  onGuardado: (lock: number, guardrails: Record<string, unknown>[]) => void;
  puedeEditar: boolean;
  /** Acciones que el agente puede usar (para la regla de acción obligatoria). */
  acciones?: string[];
}) {
  const id = useId();
  const [guardadas, setGuardadas] = useState(() => inicial.guardrails.map(reglaDesdeApi));
  const [reglas, setReglas] = useState<ReglaForm[]>(guardadas);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string> | undefined>();
  const sinCambios = JSON.stringify(reglas) === JSON.stringify(guardadas);
  const porFila = erroresPorFila(campos, "guardrails");
  const deshabilitado = !puedeEditar || guardando;

  function cambiar(i: number, cambio: Partial<ReglaForm>) {
    setReglas((rs) => rs.map((r, k) => (k === i ? { ...r, ...cambio } : r)));
  }

  async function guardar() {
    const mal = reglas.findIndex((r) => problemaDeRegla(r) !== null);
    if (mal >= 0) {
      setError(`Regla ${mal + 1}: ${problemaDeRegla(reglas[mal])}`);
      return;
    }
    setError(null);
    setCampos(undefined);
    setGuardando(true);
    try {
      const res = await fetch(coordinador ? "/api/coordinator" : `/api/agent-editor/${agenteId}/guardrails`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          coordinador
            ? { guardrails: reglas.map(reglaParaApi) }
            : { guardrails: reglas.map(reglaParaApi), lock_version: lockVersion },
        ),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        setCampos(cuerpo?.fields);
        setError(
          cuerpo?.code === "stale_lock_version"
            ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
            : typeof cuerpo?.error === "string"
              ? cuerpo.error
              : "No pudimos guardar las reglas. Inténtalo de nuevo.",
        );
        return;
      }
      const nuevo = cuerpo as ReglasDelAgente;
      nuevo.lock_version ??= lockVersion;
      const formas = nuevo.guardrails.map(reglaDesdeApi);
      setGuardadas(formas);
      setReglas(formas);
      onGuardado(nuevo.lock_version, nuevo.guardrails.map((g) => reglaParaApi(reglaDesdeApi(g))));
      toast.success("Reglas guardadas. Entran con la próxima publicación.");
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
      <h3 id={`${id}-titulo`} className="text-sm font-medium text-headline">
        {coordinador ? "Reglas de la recepción" : "Reglas de este agente"}
      </h3>
      <p className="text-sm text-text-soft">
        Lo que este agente nunca debe hacer al responder. Solo aplican a este agente; los demás siguen con las suyas.
      </p>
      {reglas.length === 0 && <p className="text-sm text-body">Aún sin reglas propias.</p>}
      <datalist id={`${id}-acciones`}>
        {acciones.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <ol className="flex flex-col gap-3">
        {reglas.map((r, i) => {
          const tipo = TIPOS_DE_REGLA.find((t) => t.id === r.kind);
          const errores = porFila.get(i);
          return (
            <li key={i} className="flex flex-col gap-3 rounded-md border border-border-soft bg-surface p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" htmlFor={`${id}-r${i}-nombre`}>
                  <Input
                    id={`${id}-r${i}-nombre`}
                    value={r.name}
                    maxLength={60}
                    placeholder="sin_descuentos"
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { name: e.target.value })}
                  />
                </Field>
                <Field label="Tipo" htmlFor={`${id}-r${i}-tipo`} help={tipo?.ayuda}>
                  <Select
                    id={`${id}-r${i}-tipo`}
                    value={r.kind}
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { kind: e.target.value as TipoDeRegla })}
                  >
                    {TIPOS_DE_REGLA.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {r.kind === "max_length" ? (
                <Field label="Máximo de caracteres" htmlFor={`${id}-r${i}-largo`}>
                  <Input
                    id={`${id}-r${i}-largo`}
                    type="number"
                    min={1}
                    max={100000}
                    value={r.value}
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { value: e.target.value })}
                    className="w-40"
                  />
                </Field>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-headline">
                    {r.kind === "forbidden_phrase" ? "Frases que nunca dice" : "Si dice alguna de estas frases"}
                  </span>
                  <ListaDeFrases
                    id={`${id}-r${i}-frases`}
                    frases={r.phrases}
                    onChange={(phrases) => cambiar(i, { phrases })}
                    placeholder="Escribe una frase y pulsa Enter"
                    agregarLabel="Agregar frase"
                    minLargo={1}
                    disabled={deshabilitado}
                  />
                </div>
              )}
              {r.kind === "required_tool" && (
                <Field label="Antes tiene que usar la acción" htmlFor={`${id}-r${i}-accion`}>
                  <Input
                    id={`${id}-r${i}-accion`}
                    list={`${id}-acciones`}
                    value={r.tool}
                    placeholder="crear_pedido"
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { tool: e.target.value })}
                  />
                </Field>
              )}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Field label="Si no se cumple" htmlFor={`${id}-r${i}-accion-falla`}>
                  <Select
                    id={`${id}-r${i}-accion-falla`}
                    value={r.action}
                    disabled={deshabilitado}
                    onChange={(e) => cambiar(i, { action: e.target.value as ReglaForm["action"] })}
                    className="w-64"
                  >
                    {ACCIONES_DE_REGLA.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titulo}
                      </option>
                    ))}
                  </Select>
                </Field>
                {puedeEditar && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    disabled={guardando}
                    aria-label={`Quitar la regla ${i + 1}`}
                    onClick={() => setReglas((rs) => rs.filter((_, k) => k !== i))}
                  >
                    <Trash2 aria-hidden className="size-4" /> Quitar
                  </Button>
                )}
              </div>
              {errores && <FormFeedback error={errores.join(" ")} />}
            </li>
          );
        })}
      </ol>
      <FormFeedback error={[error, ...erroresGenerales(campos, "guardrails")].filter(Boolean).join(" ") || null} />
      {puedeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={guardando || reglas.length >= MAX_REGLAS}
            onClick={() => setReglas((rs) => [...rs, reglaVacia()])}
          >
            <Plus aria-hidden className="size-4" /> Agregar regla
          </Button>
          <Button type="button" className="min-h-11" loading={guardando} disabled={sinCambios} onClick={() => void guardar()}>
            Guardar reglas
          </Button>
        </div>
      )}
    </section>
  );
}
