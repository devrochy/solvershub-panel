"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Trash2 } from "lucide-react";

import { useAtajos } from "@/components/shell/atajos-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { Kbd } from "@/components/ui/kbd";
import { Stepper, type StepItem, type StepState } from "@/components/ui/stepper";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { QaAdjunto, QaItem, QaResultadoPrueba } from "@/lib/api/types";
import { esCampoEditable } from "@/lib/shell/paleta";
import { ESTADO_PASO, esTerminada, etiquetaPrueba, tonoPrueba, type EstadoPaso } from "@/lib/qa/estados";
import { primerPasoPendiente } from "@/lib/qa/lista";
import { accionDeTecla } from "@/lib/qa/teclas";
import { toast } from "@/lib/toast-store";

import { URL_ADJUNTO } from "./api";
import { Registro } from "./registro";

const TIPOS_CAPTURA = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_CAPTURA = 5 * 1024 * 1024;
const ESPERA_G = 1500;

const ESTADO_STEPPER: Record<EstadoPaso, StepState> = {
  ok: "complete",
  falla: "error",
  bloqueado: "warning",
  omitido: "skipped",
};

const VARIANTE_BOTON: Record<EstadoPaso, "accent" | "danger" | "outline"> = {
  ok: "accent",
  falla: "danger",
  bloqueado: "outline",
  omitido: "outline",
};

function badgeDeEstado(estado: string) {
  const tono = tonoPrueba(estado);
  return tono === "neutral" ? (
    <Badge>{etiquetaPrueba(estado)}</Badge>
  ) : (
    <Badge variant={tono}>{etiquetaPrueba(estado)}</Badge>
  );
}

function Capturas({
  adjuntos,
  editable,
  onQuitar,
}: {
  adjuntos: QaAdjunto[];
  editable: boolean;
  onQuitar: (id: string) => void;
}) {
  if (adjuntos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Capturas del paso">
      {adjuntos.map((adj) => (
        <li key={adj.id} className="group relative">
          <a
            href={URL_ADJUNTO(adj.id)}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-md border border-border-soft bg-surface-2"
            title={adj.nombre}
          >
            {adj.mimetype.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- captura privada servida por el BFF
              <img src={URL_ADJUNTO(adj.id)} alt={`Captura ${adj.nombre}`} className="h-20 w-28 object-cover" />
            ) : (
              <span className="flex h-20 w-28 flex-col items-center justify-center gap-1 text-xs text-body">
                <FileText aria-hidden className="h-5 w-5" />
                PDF
              </span>
            )}
          </a>
          {editable && (
            <button
              type="button"
              onClick={() => onQuitar(adj.id)}
              aria-label={`Quitar la captura ${adj.nombre}`}
              className="absolute right-1 top-1 rounded-sm bg-surface-raised p-1 text-body shadow-elev-1 hover:text-status-danger-fg"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ejecución de una prueba (HU-QA-03): contexto, pasos con su resultado esperado y un paso
 * activo para aprobar, fallar, bloquear u omitir con nota y capturas. Aprobar u omitir avanza
 * solo; una falla o un bloqueo dejan el paso abierto con el foco en la nota.
 */
export function Ejecutor({
  item,
  resultado,
  empezada,
  editable,
  onMarcar,
  onNotaDePaso,
  onNotaDePrueba,
  onCapturas,
  onQuitarCaptura,
  onSiguiente,
  onVecina,
}: {
  item: QaItem;
  resultado: QaResultadoPrueba | undefined;
  empezada: boolean;
  editable: boolean;
  onMarcar: (n: number, estado: EstadoPaso | null) => Promise<boolean>;
  onNotaDePaso: (n: number, nota: string) => Promise<boolean>;
  onNotaDePrueba: (nota: string) => Promise<boolean>;
  onCapturas: (n: number, archivos: File[]) => Promise<void>;
  onQuitarCaptura: (id: string) => void;
  onSiguiente: () => void;
  onVecina: (paso: 1 | -1) => void;
}) {
  const pasos = item.pasos ?? [];
  const marcas = resultado?.pasos ?? {};
  const adjuntos = resultado?.adjuntos ?? [];
  const estado = resultado?.estado ?? "sin_correr";
  const [activo, setActivo] = useState<number | null>(() => primerPasoPendiente(pasos.length, marcas));
  const [pestana, setPestana] = useState("pasos");
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [notaGeneral, setNotaGeneral] = useState(resultado?.nota ?? "");
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const ultimaG = useRef(0);
  const atajosActivos = useAtajos()?.atajosActivos ?? true;
  const terminada = esTerminada(estado) && primerPasoPendiente(pasos.length, marcas) === null;

  async function marcar(n: number, nuevo: EstadoPaso) {
    if (!editable) return;
    const nota = notas[String(n)];
    if (nota !== undefined && nota.trim() !== (marcas[String(n)]?.nota ?? "")) {
      await onNotaDePaso(n, nota);
    }
    const ok = await onMarcar(n, nuevo);
    if (!ok) return;
    if (nuevo === "ok" || nuevo === "omitido") {
      // El siguiente paso sin marcar, contando el que se acaba de marcar.
      const resto = { ...marcas, [String(n)]: { estado: nuevo } };
      setActivo(primerPasoPendiente(pasos.length, resto));
    } else {
      // Foco directo (no `requestAnimationFrame`: no corre con la pestaña oculta y lo que se
      // escribiera después caería en los atajos). El paso sigue abierto: su nota ya existe.
      notaRef.current?.focus();
    }
  }

  const alPulsar = useEffectEvent((e: KeyboardEvent) => {
    if (!atajosActivos || e.defaultPrevented) return;
    const destino = e.target as HTMLElement | null;
    if (destino?.closest?.('[role="dialog"], [role="alertdialog"]')) return;
    if (e.key === "g") {
      ultimaG.current = e.timeStamp;
      return;
    }
    // `g` + letra es de la navegación del panel (HU-DS-05): no se pisa.
    if (e.timeStamp - ultimaG.current < ESPERA_G) return;
    const accion = accionDeTecla({
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      enCampo: esCampoEditable(destino),
    });
    if (!accion) return;
    if (accion.tipo === "prueba") {
      e.preventDefault();
      onVecina(accion.paso);
    } else if (editable && activo !== null) {
      e.preventDefault();
      void marcar(activo, accion.estado);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  const steps: StepItem[] = pasos.map((paso, i) => {
    const n = i + 1;
    const marca = marcas[String(n)]?.estado as EstadoPaso | null | undefined;
    const esActivo = activo === n;
    const capturas = adjuntos.filter((a) => a.paso === n);
    const notaGuardada = marcas[String(n)]?.nota ?? "";
    const state: StepState = esActivo ? "current" : marca ? ESTADO_STEPPER[marca] : "upcoming";
    return {
      id: String(n),
      title: paso.accion,
      description: esActivo
        ? undefined
        : [paso.esperado ? `Esperado: ${paso.esperado}` : null, notaGuardada ? `Nota: ${notaGuardada}` : null, capturas.length ? `${capturas.length} captura(s)` : null]
            .filter(Boolean)
            .join(" · ") || undefined,
      state,
      stateLabel: marca ? ESTADO_PASO[marca].label : undefined,
      content: esActivo ? (
        <div className="flex flex-col gap-4">
          {(paso.esperado || (n === pasos.length && item.esperado)) && (
            <div className="rounded-md border border-status-info-border bg-status-info-bg px-3 py-2 text-sm text-headline">
              <span className="block text-xs font-medium text-status-info-fg">Resultado esperado</span>
              {paso.esperado ?? item.esperado}
            </div>
          )}
          {marca && (
            <p className="text-xs text-body">
              Marcado como <span className="font-medium text-headline">{ESTADO_PASO[marca].label}</span>. Puedes
              cambiarlo.
            </p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Resultado del paso ${n}`}>
            {(Object.keys(ESTADO_PASO) as EstadoPaso[]).map((clave) => (
              <Button
                key={clave}
                size="sm"
                variant={VARIANTE_BOTON[clave]}
                disabled={!editable}
                aria-pressed={marca === clave}
                onClick={() => void marcar(n, clave)}
              >
                {ESTADO_PASO[clave].accion}
                <Kbd keys={[ESTADO_PASO[clave].tecla]} className="hidden sm:inline-flex" />
              </Button>
            ))}
            {marca && editable && (
              <Button size="sm" variant="ghost" onClick={() => void onMarcar(n, null)}>
                Desmarcar
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`nota-${item.slug}-${n}`} className="text-sh-label text-headline">
              Nota del paso
            </label>
            <Textarea
              ref={notaRef}
              id={`nota-${item.slug}-${n}`}
              rows={3}
              className="min-h-20"
              disabled={!editable}
              placeholder={marca === "falla" ? "Qué pasó: lo que viste, el mensaje de error, el dato que usaste…" : "Opcional: lo que viste, datos usados, enlaces"}
              value={notas[String(n)] ?? notaGuardada}
              onChange={(e) => setNotas((prev) => ({ ...prev, [String(n)]: e.target.value }))}
              onBlur={(e) => void onNotaDePaso(n, e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Capturas adjuntos={capturas} editable={editable} onQuitar={onQuitarCaptura} />
            {editable && (
              <Dropzone
                accept={TIPOS_CAPTURA}
                maxBytes={MAX_CAPTURA}
                hint="PNG, JPG, WEBP o PDF de hasta 5 MB. Con el foco aquí, Ctrl+V pega una captura."
                onFiles={(archivos) => void onCapturas(n, archivos)}
                onReject={(motivo) => toast.error(motivo)}
              />
            )}
          </div>
        </div>
      ) : undefined,
    };
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-soft">
              {[item.modulo, item.grupo].filter(Boolean).join(" · ")}
            </p>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Prueba anterior (K)" onClick={() => onVecina(-1)}>
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Prueba siguiente (J)" onClick={() => onVecina(1)}>
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-sh-h1 text-headline">{item.titulo}</h2>
            {badgeDeEstado(estado)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {item.prioridad && <Badge variant={item.prioridad === "P0" ? "accent" : "neutral"}>{item.prioridad === "P0" ? "Humo · P0" : item.prioridad}</Badge>}
            {(item.plataforma ?? []).map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
            {(item.hu ?? []).map((hu) => (
              <Badge key={hu} className="font-mono">
                {hu}
              </Badge>
            ))}
            {Object.keys(item.ejecuciones ?? {}).length > 0 && (
              <span className="text-xs text-text-soft">
                En el ciclo: {etiquetaPrueba(item.estado)} ·{" "}
                {Object.values(item.ejecuciones ?? {}).reduce((a, b) => a + b, 0)} ejecución(es)
              </span>
            )}
          </div>
          {(item.contexto || item.resumen) && <p className="max-w-prose text-sm text-body">{item.contexto ?? item.resumen}</p>}
          {((item.precondiciones ?? []).length > 0 || (item.datos ?? []).length > 0) && (
            <dl className="grid gap-4 rounded-md bg-surface-2 p-4 text-sm sm:grid-cols-2">
              {(item.precondiciones ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sh-label text-headline">Antes de empezar</dt>
                  <dd>
                    <ul className="list-disc space-y-0.5 pl-4 text-body">
                      {(item.precondiciones ?? []).map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {(item.datos ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sh-label text-headline">Datos de prueba</dt>
                  <dd>
                    <ul className="list-disc space-y-0.5 pl-4 text-body">
                      {(item.datos ?? []).map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </header>

        {!empezada && (
          <p role="status" className="rounded-md border border-border-soft px-3 py-2 text-sm text-body">
            Estás viendo la prueba. Pulsa <span className="font-medium text-headline">Empezar a probar</span> arriba
            para marcar resultados.
          </p>
        )}

        <Tabs
          items={[
            { id: "pasos", label: `Pasos (${pasos.length})` },
            { id: "registro", label: "Registro" },
          ]}
          value={pestana}
          onValueChange={setPestana}
        />

        {pestana === "pasos" ? (
          <div role="tabpanel" aria-label="Pasos" className="flex flex-col gap-4">
            <Stepper label={`Pasos de ${item.titulo}`} steps={steps} onSelect={(id) => setActivo(Number(id))} />
            {terminada && (
              <section aria-label="Resultado de la prueba" className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sh-label text-headline">Resultado de la prueba</span>
                  {badgeDeEstado(estado)}
                </div>
                <label htmlFor={`nota-general-${item.slug}`} className="text-sm text-body">
                  Nota general (opcional)
                </label>
                <Textarea
                  id={`nota-general-${item.slug}`}
                  rows={2}
                  className="min-h-16"
                  disabled={!editable}
                  value={notaGeneral}
                  onChange={(e) => setNotaGeneral(e.target.value)}
                  onBlur={(e) => void onNotaDePrueba(e.target.value)}
                />
                <div>
                  <Button variant="accent" onClick={onSiguiente}>
                    Siguiente prueba sin terminar
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}
            <p className="hidden text-xs text-text-soft md:block">
              Atajos: <Kbd keys={["A"]} /> aprobar · <Kbd keys={["F"]} /> falla · <Kbd keys={["B"]} /> bloqueado ·{" "}
              <Kbd keys={["O"]} /> omitir · <Kbd keys={["J"]} /> <Kbd keys={["K"]} /> cambiar de prueba
            </p>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Registro">
            <Registro slug={item.slug} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
