"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Crown,
  Eye,
  Feather,
  FlaskConical,
  Gem,
  Image as ImageIcon,
  Info,
  Mic,
  Scale,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { MediaAudioSettings, MediaSettings, MediaVisionSettings } from "@/lib/api/types";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { igualProfundo } from "@/lib/configuracion-secciones";
import {
  costoVisible,
  etiquetaCalidad,
  opcionesDeMedia,
  resolverSeleccion,
  type CapacidadMedia,
  type OpcionMedia,
} from "@/lib/media-opciones";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

/** Icono por identidad de opción; el catálogo solo manda el `tier`. */
const ICONOS: Record<string, LucideIcon> = {
  economico: Feather,
  equilibrado: Scale,
  rapido: Zap,
  precision: Gem,
  preciso: Sparkles,
  detallado: Eye,
  maxima: Crown,
};

const LEYENDA_AUDIO = "Estimado para 10 minutos de audio";
const LEYENDA_VISION = "Estimado para 100 imágenes";

/** Configuración de multimedia: notas de voz (STT) e imágenes (visión). */
export function MultimediaForm({
  media,
  puedeEditar = true,
}: {
  media: MediaSettings;
  puedeEditar?: boolean;
}) {
  const opcionesAudio = useMemo(() => opcionesDeMedia(media, "audio"), [media]);
  const opcionesVision = useMemo(() => opcionesDeMedia(media, "vision"), [media]);
  const inicialAudio = useMemo(() => resolverSeleccion(media.audio, media, "audio"), [media]);
  const inicialVision = useMemo(() => resolverSeleccion(media.vision, media, "vision"), [media]);

  const [audio, setAudio] = useState<MediaAudioSettings>(() => ({
    ...media.audio,
    ...inicialAudio.seleccion,
  }));
  const [vision, setVision] = useState<MediaVisionSettings>(() => ({
    ...media.vision,
    ...inicialVision.seleccion,
  }));
  const [guardado, setGuardado] = useState({ audio: media.audio, vision: media.vision });
  const [notaAudio, setNotaAudio] = useState<string | undefined>(inicialAudio.nota);
  const [notaVision, setNotaVision] = useState<string | undefined>(inicialVision.nota);

  const guardar = useAction();
  const probar = useAction({ refresh: false });
  const ocupado = guardar.pending || probar.pending;
  const hayCambios = !igualProfundo({ audio, vision }, guardado);
  useAvisarCambios("multimedia", hayCambios);

  function elegir(capacidad: CapacidadMedia, opcion: OpcionMedia) {
    if (capacidad === "audio") {
      setAudio((prev) => ({ ...prev, provider: opcion.provider, model: opcion.model }));
      setNotaAudio(undefined);
    } else {
      setVision((prev) => ({ ...prev, provider: opcion.provider, model: opcion.model }));
      setNotaVision(undefined);
    }
  }

  async function probarConexion() {
    const objetivos: { kind: CapacidadMedia; provider: string; model: string }[] = [];
    if (audio.enabled && opcionesAudio.length > 0) {
      objetivos.push({ kind: "audio", provider: audio.provider, model: audio.model });
    }
    if (vision.enabled && opcionesVision.length > 0) {
      objetivos.push({ kind: "vision", provider: vision.provider, model: vision.model });
    }
    if (objetivos.length === 0) {
      toast.error(
        audio.enabled || vision.enabled
          ? "No hay una opción disponible para probar."
          : "Enciende al menos un medio para probar.",
      );
      return;
    }

    await probar.run(async () => {
      for (const objetivo of objetivos) {
        const res = await fetch("/api/settings/media/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...objetivo, api_key: "" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: json.error ?? "No se pudo probar la conexión.",
          };
        }
      }
      return { ok: true, success: "Conexión verificada." };
    });
  }

  async function guardarCambios() {
    const cambios: { kind: CapacidadMedia; body: Record<string, unknown> }[] = [];
    if (!igualProfundo(audio, guardado.audio)) {
      cambios.push({
        kind: "audio",
        body: {
          action: "audio",
          enabled: audio.enabled,
          provider: audio.provider,
          model: audio.model,
        },
      });
    }
    if (!igualProfundo(vision, guardado.vision)) {
      cambios.push({
        kind: "vision",
        body: {
          action: "vision",
          enabled: vision.enabled,
          mode: vision.mode,
          provider: vision.provider,
          model: vision.model,
        },
      });
    }
    if (cambios.length === 0) return;

    await guardar.run(async () => {
      let nuevo = { ...guardado };
      for (const cambio of cambios) {
        const res = await fetch("/api/settings/media", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambio.body),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setGuardado(nuevo);
          return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar." };
        }
        nuevo =
          cambio.kind === "audio"
            ? { ...nuevo, audio: { ...audio } }
            : { ...nuevo, vision: { ...vision } };
      }
      setGuardado(nuevo);
      setNotaAudio(undefined);
      setNotaVision(undefined);
      return { ok: true, success: "Cambios guardados." };
    });
  }

  if (!media.catalog?.audio?.length && !media.catalog?.vision?.length) {
    return (
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-body">
            La configuración de multimedia no está disponible en este servidor. Actualiza el
            backend y vuelve a cargar la página.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-5">
        <CapacidadCard
          icono={Mic}
          titulo="Notas de voz"
          ariaLabel="Entender notas de voz"
          descripcion="El cliente manda un audio y el asistente responde como si lo hubiera escrito."
          encendido={audio.enabled}
          hayOpciones={opcionesAudio.length > 0}
          puedeEditar={puedeEditar}
          onEncendido={(enabled) => setAudio((prev) => ({ ...prev, enabled }))}
        >
          {notaAudio && <NotaRetirada texto={notaAudio} />}
          <OpcionesCalidad
            capacidad="audio"
            leyenda={LEYENDA_AUDIO}
            opciones={opcionesAudio}
            seleccion={{ provider: audio.provider, model: audio.model }}
            onElegir={(opcion) => elegir("audio", opcion)}
            deshabilitado={!puedeEditar}
          />
          <NotaPie />
        </CapacidadCard>

        <CapacidadCard
          icono={ImageIcon}
          titulo="Imágenes"
          ariaLabel="Entender imágenes"
          descripcion="El asistente mira la foto, la describe y sigue la conversación como texto."
          encendido={vision.enabled}
          hayOpciones={opcionesVision.length > 0}
          puedeEditar={puedeEditar}
          onEncendido={(enabled) => setVision((prev) => ({ ...prev, enabled }))}
        >
          {notaVision && <NotaRetirada texto={notaVision} />}
          <div className="mb-4 flex flex-col gap-2">
            <span className="text-sh-label font-medium text-body">Qué hace con la foto</span>
            <SegmentedControl
              label="Qué hace con la foto"
              options={[
                { value: "describir", label: "Describir" },
                { value: "sin_descripcion", label: "Solo confirmar" },
              ]}
              value={vision.mode}
              onChange={puedeEditar ? (mode) => setVision((prev) => ({ ...prev, mode })) : undefined}
              className="self-start"
            />
            <p className="text-xs text-text-soft">
              {vision.mode === "sin_descripcion"
                ? "Avisa que la foto llegó y pregunta qué necesita. No la describe."
                : "Cuenta lo que ve y sigue la charla como texto."}
            </p>
          </div>
          <OpcionesCalidad
            capacidad="vision"
            leyenda={LEYENDA_VISION}
            opciones={opcionesVision}
            seleccion={{ provider: vision.provider, model: vision.model }}
            onElegir={(opcion) => elegir("vision", opcion)}
            deshabilitado={!puedeEditar}
          />
          <NotaPie />
        </CapacidadCard>
      </ControlesEditables>

      {puedeEditar ? (
        <div className="sticky bottom-0 z-10 -mx-5 flex flex-col gap-3 border-t border-border-soft bg-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 text-xs",
              hayCambios ? "text-status-warning-fg" : "text-text-soft",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                hayCambios ? "bg-status-warning-fg" : "bg-border-strong",
              )}
            />
            {hayCambios ? "Cambios sin guardar" : "Sin cambios"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => void probarConexion()}
              disabled={ocupado || (!audio.enabled && !vision.enabled)}
              loading={probar.pending}
              className="pointer-coarse:h-11"
            >
              {!probar.pending && <FlaskConical className="h-4 w-4" aria-hidden />}
              Probar conexión
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={() => void guardarCambios()}
              disabled={ocupado || !hayCambios}
              loading={guardar.pending}
              className="pointer-coarse:h-11"
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      ) : (
        <AvisoSoloLectura />
      )}
    </div>
  );
}

function CapacidadCard({
  icono: Icono,
  titulo,
  ariaLabel,
  descripcion,
  encendido,
  hayOpciones,
  puedeEditar,
  onEncendido,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  ariaLabel: string;
  descripcion: string;
  encendido: boolean;
  hayOpciones: boolean;
  puedeEditar: boolean;
  onEncendido: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Card className="bg-surface-2">
      <CardHeader className="flex-row items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-focus/10 text-focus">
          <Icono className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle as="h3">{titulo}</CardTitle>
          <p className="mt-0.5 text-xs text-text-soft">{descripcion}</p>
        </div>
        <Switch
          checked={encendido}
          onCheckedChange={onEncendido}
          disabled={!puedeEditar || !hayOpciones}
          aria-label={ariaLabel}
        />
      </CardHeader>
      <CardContent>
        {encendido && hayOpciones ? (
          children
        ) : (
          <p className="pl-[52px] text-xs text-text-soft">
            {hayOpciones
              ? "Apagado. Enciéndelo para elegir una opción."
              : "No hay opciones disponibles con tu cuenta. Pídele a quien administra tu negocio que habilite un modelo."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OpcionesCalidad({
  capacidad,
  leyenda,
  opciones,
  seleccion,
  onElegir,
  deshabilitado,
}: {
  capacidad: CapacidadMedia;
  leyenda: string;
  opciones: OpcionMedia[];
  seleccion: { provider: string; model: string };
  onElegir: (opcion: OpcionMedia) => void;
  deshabilitado: boolean;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="flex flex-wrap items-baseline gap-1.5 text-sh-label font-medium text-body">
        Calidad y costo <span className="text-xs font-normal text-text-soft">{leyenda}</span>
      </legend>
      <div className="mt-2.5 overflow-hidden rounded-md border border-border bg-surface">
        {opciones.map((opcion) => (
          <OpcionFila
            key={opcion.clave}
            capacidad={capacidad}
            opcion={opcion}
            seleccionada={
              seleccion.provider === opcion.provider && seleccion.model === opcion.model
            }
            onElegir={() => onElegir(opcion)}
            deshabilitada={deshabilitado}
          />
        ))}
      </div>
    </fieldset>
  );
}

function OpcionFila({
  capacidad,
  opcion,
  seleccionada,
  onElegir,
  deshabilitada,
}: {
  capacidad: CapacidadMedia;
  opcion: OpcionMedia;
  seleccionada: boolean;
  onElegir: () => void;
  deshabilitada: boolean;
}) {
  const Icono = ICONOS[opcion.tier] ?? Sparkles;
  const { monto, unidad } = costoVisible(opcion);

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-soft px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-hover focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus",
        seleccionada && "bg-focus/5",
        deshabilitada && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name={`${capacidad}_option`}
        value={opcion.clave}
        checked={seleccionada}
        onChange={onElegir}
        disabled={deshabilitada}
        className="sr-only"
      />
      {seleccionada && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-focus" />}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-focus/10 text-focus">
        <Icono className="h-[15px] w-[15px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-display text-sm font-semibold text-headline">
          {opcion.nombre}
          {opcion.recomendada && (
            <span className="rounded-pill border border-focus/30 bg-focus/10 px-1.5 py-px text-[10px] font-medium tracking-[0.04em] text-focus uppercase">
              Recomendado
            </span>
          )}
        </span>
        <span className="block text-xs text-text-soft">{opcion.descripcion}</span>
      </span>
      <span className="order-3 flex w-full items-center justify-between gap-2 border-t border-border-soft pt-2 text-xs text-text-soft sm:order-none sm:w-[138px] sm:flex-col sm:items-end sm:gap-0.5 sm:border-0 sm:pt-0 sm:text-right">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 w-2 rounded-sm",
                  n <= opcion.calidad ? "bg-focus" : "bg-border-strong",
                )}
              />
            ))}
          </span>
          {etiquetaCalidad(opcion.calidad)}
        </span>
        <span className="font-mono text-[13px] font-medium tabular-nums text-headline">
          {monto}{" "}
          <span className="font-sans text-[11px] font-normal text-text-soft">{unidad}</span>
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "order-2 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-focus text-[var(--sh-bg-deep)] sm:order-none",
          !seleccionada && "invisible",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </label>
  );
}

function NotaRetirada({ texto }: { texto: string }) {
  return (
    <p className="mb-3 flex items-start gap-1.5 rounded-md bg-status-warning-bg px-2.5 py-2 text-xs text-status-warning-fg">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {texto}
    </p>
  );
}

function NotaPie() {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-text-soft">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      Elegimos el proveedor y el modelo por ti. Tú solo eliges calidad y costo.
    </p>
  );
}
