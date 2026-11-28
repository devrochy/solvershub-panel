"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, Hand, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackReporteMaster } from "@/lib/api/types";
import {
  MOTIVOS_DE_RECHAZO,
  MOTIVO_LABEL,
  TOPE_MENSUAL_POR_NEGOCIO,
  TOPE_POR_REPORTE,
  esUuid,
  mensajeDeRevision,
  type ErrorDelBff,
  type MotivoDeRechazo,
} from "@/lib/feedback-revision";
import { formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast-store";

type Reporte = Pick<FeedbackReporteMaster, "id" | "estado" | "tenant_name" | "titulo">;

type Resultado = { ok: true } | { ok: false; mensaje: string };

/**
 * Llama al BFF de la revisión. Con 409 (`reporte_ya_decidido`, `reporte_ya_tomado`) la vista se refresca
 * para mostrar el estado real; el mensaje lo arma `mensajeDeRevision`.
 */
async function enviar(id: string, accion: "tomar" | "aprobar" | "rechazar", cuerpo: unknown, refrescar: () => void): Promise<Resultado> {
  const res = await fetch(`/api/platform/feedback/reports/${id}/${accion}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  }).catch(() => null);
  if (!res) return { ok: false, mensaje: "No se pudo contactar el servidor." };
  if (res.ok) return { ok: true };
  const json = (await res.json().catch(() => null)) as ErrorDelBff | null;
  const { mensaje, recargar } = mensajeDeRevision(res.status, json);
  if (recargar) refrescar();
  return { ok: false, mensaje };
}

/**
 * Acciones del master sobre un reporte (ADR-0213): tomarlo, aprobarlo con un monto de créditos de regalo
 * para el negocio o rechazarlo con un motivo visible al cliente. Solo se ofrecen las que el estado admite:
 * aprobado y rechazado son terminales. El tester no las ve (la página no renderiza este componente).
 */
export function AccionesDeRevision({ reporte }: { reporte: Reporte }) {
  const router = useRouter();
  const [tomando, setTomando] = useState(false);
  const abierto = reporte.estado === "recibido" || reporte.estado === "en_revision";
  if (!abierto) return null;

  async function tomar() {
    if (tomando) return;
    setTomando(true);
    const r = await enviar(reporte.id, "tomar", undefined, () => router.refresh());
    setTomando(false);
    if (r.ok) {
      toast.success("Reporte tomado. Queda a tu nombre.");
      router.refresh();
    } else {
      toast.error(r.mensaje);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Decidir el reporte">
      {reporte.estado === "recibido" && (
        <Button type="button" variant="outline" onClick={tomar} disabled={tomando} loading={tomando}>
          <Hand className="h-4 w-4" aria-hidden />
          Tomar
        </Button>
      )}
      <AprobarReporte reporte={reporte} />
      <RechazarReporte reporte={reporte} />
    </div>
  );
}

/**
 * Aprobar en dos pasos: el monto (entero > 0, con los topes a la vista) y luego confirmar el número
 * escrito, para no regalar 50.000 por 5.000. El abono no se puede corregir después (ADR-0213 §9).
 */
export function AprobarReporte({ reporte }: { reporte: Reporte }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creditos, setCreditos] = useState(0);
  const [paso, setPaso] = useState<"monto" | "confirmar">("monto");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Doble clic: el ref corta antes de que React pinte el botón deshabilitado.
  const enCurso = useRef(false);
  // Solo aviso: el tope real es configuración del core y lo hace cumplir el 422 del servidor.
  const fueraDeTope = creditos > TOPE_POR_REPORTE;

  function siguiente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(creditos) || creditos <= 0) {
      setError("Escribe los créditos como un número entero mayor que 0.");
      return;
    }
    setError(null);
    setPaso("confirmar");
  }

  async function confirmar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    const r = await enviar(reporte.id, "aprobar", { creditos }, () => router.refresh());
    enCurso.current = false;
    setEnviando(false);
    if (r.ok) {
      setOpen(false);
      toast.success(`Reporte aprobado: ${formatNumber(creditos)} créditos de regalo para ${reporte.tenant_name || "el negocio"}.`);
      router.refresh();
      return;
    }
    setError(r.mensaje);
    setPaso("monto");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(valor) => {
        if (enviando) return;
        if (valor) {
          setCreditos(0);
          setPaso("monto");
          setError(null);
        }
        setOpen(valor);
      }}
    >
      <Button type="button" variant="accent" onClick={() => setOpen(true)}>
        <Check className="h-4 w-4" aria-hidden />
        Aprobar
      </Button>
      <DialogContent
        title="Aprobar el reporte"
        description={`Los créditos son un regalo para ${reporte.tenant_name || "el negocio"}, no para la persona que reportó.`}
        className="max-w-lg"
      >
        {paso === "monto" ? (
          <form onSubmit={siguiente} className="flex flex-col gap-4" noValidate>
            <Field
              label="Créditos de regalo"
              htmlFor="feedback-creditos"
              help={
                fueraDeTope
                  ? `Pasa el tope por reporte habitual (${formatNumber(TOPE_POR_REPORTE)} créditos): el servidor lo rechazará si sigue vigente.`
                  : `Tope por reporte: ${formatNumber(TOPE_POR_REPORTE)} créditos. Tope del mes por negocio: ${formatNumber(TOPE_MENSUAL_POR_NEGOCIO)}.`
              }
              required
            >
              <InputNumero id="feedback-creditos" value={creditos} onValueChange={setCreditos} min={0} autoComplete="off" autoFocus />
            </Field>
            {error && <FormFeedback error={error} />}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="accent" disabled={creditos <= 0}>
                Revisar monto
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-body">
              Vas a regalar{" "}
              <strong className="text-sh-block font-display tabular-nums text-headline">{formatNumber(creditos)} créditos</strong> a{" "}
              <strong className="text-headline">{reporte.tenant_name || "este negocio"}</strong> por «{reporte.titulo}». El abono no se
              puede deshacer.
            </p>
            {error && <FormFeedback error={error} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={enviando} onClick={() => setPaso("monto")}>
                Cambiar monto
              </Button>
              <Button type="button" variant="accent" disabled={enviando} loading={enviando} onClick={confirmar}>
                {enviando ? "Aprobando…" : `Sí, regalar ${formatNumber(creditos)}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Rechazar con un motivo del catálogo, el texto que verá el cliente, la nota interna y el original si es un duplicado. */
export function RechazarReporte({ reporte }: { reporte: Reporte }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivoCodigo, setMotivoCodigo] = useState<MotivoDeRechazo | "">("");
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [duplicadoDe, setDuplicadoDe] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);
  const esDuplicado = motivoCodigo === "duplicado";
  const duplicadoInvalido = esDuplicado && duplicadoDe.trim() !== "" && !esUuid(duplicadoDe.trim());
  const listo = motivoCodigo !== "" && motivo.trim().length >= 3 && (!esDuplicado || esUuid(duplicadoDe.trim()));

  async function rechazar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listo || enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    const cuerpo = {
      motivo_codigo: motivoCodigo,
      motivo: motivo.trim(),
      ...(nota.trim() ? { nota_interna: nota.trim() } : {}),
      ...(esDuplicado ? { duplicado_de: duplicadoDe.trim() } : {}),
    };
    const r = await enviar(reporte.id, "rechazar", cuerpo, () => router.refresh());
    enCurso.current = false;
    setEnviando(false);
    if (r.ok) {
      setOpen(false);
      toast.success("Reporte rechazado. El cliente verá el motivo.");
      router.refresh();
      return;
    }
    setError(r.mensaje);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(valor) => {
        if (enviando) return;
        if (valor) {
          setMotivoCodigo("");
          setMotivo("");
          setNota("");
          setDuplicadoDe("");
          setError(null);
        }
        setOpen(valor);
      }}
    >
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <X className="h-4 w-4" aria-hidden />
        Rechazar
      </Button>
      <DialogContent title="Rechazar el reporte" description="El cliente verá el motivo y el texto; la nota interna es solo para el equipo." className="max-w-xl">
        <form onSubmit={rechazar} className="flex flex-col gap-4" noValidate>
          <Field label="Motivo" htmlFor="feedback-motivo-codigo" required>
            <Select id="feedback-motivo-codigo" value={motivoCodigo} onChange={(e) => setMotivoCodigo(e.target.value as MotivoDeRechazo | "")}>
              <option value="">Elige un motivo</option>
              {MOTIVOS_DE_RECHAZO.map((m) => (
                <option key={m} value={m}>
                  {MOTIVO_LABEL[m]}
                </option>
              ))}
            </Select>
          </Field>
          {esDuplicado && (
            <Field
              label="Id del reporte original"
              htmlFor="feedback-duplicado-de"
              help="Puede ser de otro negocio: el cliente no ve a cuál apunta."
              error={duplicadoInvalido ? "No es un id válido." : undefined}
              required
            >
              <Input
                id="feedback-duplicado-de"
                value={duplicadoDe}
                onChange={(e) => setDuplicadoDe(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>
          )}
          <Field label="Texto para el cliente" htmlFor="feedback-motivo" help={`${motivo.trim().length} de 500 caracteres.`} required>
            <Textarea id="feedback-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={3} />
          </Field>
          <Field label="Nota interna" htmlFor="feedback-nota" help="Opcional. Solo la ve el equipo de SolversHub.">
            <Textarea id="feedback-nota" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={2000} rows={3} />
          </Field>
          {error && <FormFeedback error={error} />}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={enviando}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="danger" disabled={!listo || enviando} loading={enviando}>
              {enviando ? "Rechazando…" : "Rechazar reporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
