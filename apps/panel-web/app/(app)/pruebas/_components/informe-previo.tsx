"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { QaEjecucion, QaItem } from "@/lib/api/types";
import { ESTADO_PASO, porcentaje, segmentosDeProgreso, type EstadoPaso } from "@/lib/qa/estados";
import { toast } from "@/lib/toast-store";

import { URL_ADJUNTO, llamarQa } from "./api";
import { IconoEstado } from "./icono-estado";

/**
 * Vista previa y envío del informe (HU-QA-03, D-SPEC-30-5): resumen, fallas y bloqueos con su
 * evidencia y lo que quedó sin correr. Al enviar, la ejecución queda en solo lectura y al dueño
 * le llega un correo con el enlace.
 */
export function InformePrevio({
  abierto,
  onAbierto,
  run,
  items,
}: {
  abierto: boolean;
  onAbierto: (v: boolean) => void;
  run: QaEjecucion;
  items: QaItem[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const p = run.progreso;
  const resultados = run.resultados ?? {};
  const problemas = items.filter((i) => ["falla", "bloqueada"].includes(resultados[i.slug]?.estado ?? ""));
  const sinTerminar = p.total - p.terminadas;

  async function enviar() {
    const ok = await confirm({
      title: "¿Enviar tu informe?",
      description:
        sinTerminar > 0
          ? `Quedan ${sinTerminar} pruebas sin terminar: irán en el informe como «sin correr». Tu ejecución queda en solo lectura y al dueño le llega un correo con el enlace.`
          : "Tu ejecución queda en solo lectura y al dueño le llega un correo con el enlace.",
      confirmLabel: "Enviar informe",
    });
    if (!ok) return;
    setEnviando(true);
    const r = await llamarQa<QaEjecucion>("runs/me/submit", { method: "POST", json: { comentario: comentario.trim() || null } });
    setEnviando(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Informe enviado. Queda en Informes y se le avisa al dueño por correo.");
    onAbierto(false);
    router.push(`/pruebas/informes/${r.data.id}`);
    router.refresh();
  }

  return (
    <Sheet open={abierto} onOpenChange={onAbierto}>
      <SheetContent
        title="Enviar informe"
        description="Revisa lo que va en tu informe antes de enviarlo."
        className="sm:max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onAbierto(false)}>
              Seguir probando
            </Button>
            <Button variant="accent" onClick={() => void enviar()} loading={enviando}>
              <Send aria-hidden className="h-4 w-4" />
              Enviar informe
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <section aria-label="Resumen" className="flex flex-col gap-2">
            <p className="text-sm text-body">
              <span className="font-display text-sh-hero tabular-nums text-headline">{p.terminadas}</span> de {p.total}{" "}
              pruebas terminadas ({porcentaje(p.terminadas, p.total)} %)
            </p>
            <Progress
              label="Avance del informe"
              value={p.terminadas}
              max={p.total || 1}
              segments={segmentosDeProgreso(p).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }))}
            />
            <dl className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-5">
              {[
                ["OK", p.ok],
                ["Falla", p.falla],
                ["Bloqueada", p.bloqueada],
                ["Omitida", p.omitida],
                ["Sin terminar", sinTerminar],
              ].map(([label, valor]) => (
                <div key={label} className="rounded-md bg-surface-2 px-2 py-2">
                  <dt className="text-xs text-text-soft">{label}</dt>
                  <dd className="font-display text-sh-block tabular-nums text-headline">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Fallas y bloqueos" className="flex flex-col gap-3">
            <h3 className="font-display text-sh-block text-headline">Fallas y bloqueos ({problemas.length})</h3>
            {problemas.length === 0 ? (
              <p className="text-sm text-body">Ninguna prueba con falla ni bloqueo.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {problemas.map((item) => {
                  const res = resultados[item.slug];
                  return (
                    <li key={item.slug} className="flex flex-col gap-2 rounded-md border border-border-soft p-3">
                      <div className="flex items-start gap-2">
                        <IconoEstado estado={res?.estado} className="mt-0.5" />
                        <span className="text-sm font-medium text-headline">{item.titulo}</span>
                      </div>
                      <ol className="flex flex-col gap-1 pl-6 text-sm text-body">
                        {(item.pasos ?? []).map((paso, i) => {
                          const marca = res?.pasos?.[String(i + 1)];
                          if (!marca?.estado || marca.estado === "ok") return null;
                          return (
                            <li key={i}>
                              <span className="text-headline">
                                Paso {i + 1} · {ESTADO_PASO[marca.estado as EstadoPaso]?.label}:
                              </span>{" "}
                              {paso.accion}
                              {marca.nota && <span className="block text-xs text-text-soft">Nota: {marca.nota}</span>}
                            </li>
                          );
                        })}
                      </ol>
                      {(res?.adjuntos ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-6">
                          {(res?.adjuntos ?? []).map((a) =>
                            a.mimetype.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element -- captura privada servida por el BFF
                              <img key={a.id} src={URL_ADJUNTO(a.id)} alt={`Captura ${a.nombre}`} className="h-14 w-20 rounded-sm object-cover" />
                            ) : (
                              <span key={a.id} className="rounded-sm bg-hover px-2 py-1 text-xs text-body">
                                {a.nombre}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="comentario-informe" className="text-sh-label text-headline">
              Comentario para el dueño (opcional)
            </label>
            <Textarea
              id="comentario-informe"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Lo más importante que encontraste, lo que no pudiste probar y por qué…"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
