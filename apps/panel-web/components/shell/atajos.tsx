"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import {
  AtajosContext,
  EVENTO_ALTERNAR_MENU,
  EVENTO_CAMBIAR_TEMA,
  type Atajos,
} from "@/components/shell/atajos-context";
import { AyudaDeAtajos } from "@/components/shell/ayuda-de-atajos";
import { useShell } from "@/components/shell/shell-context";
import { useConfirm } from "@/components/ui/confirm";
import { toast } from "@/lib/toast-store";
import { destinoDeAtajo, esCampoEditable, seccionesDePaleta, type TipoAccion } from "@/lib/shell/paleta";
import { cookieAtajos } from "@/lib/shell/preferencias";

/** `cmdk` y la paleta se descargan la primera vez que se abre, no con cada página. */
const PaletaDeComandos = dynamic(
  () => import("@/components/shell/paleta-de-comandos").then((m) => m.PaletaDeComandos),
  { ssr: false },
);

/** Tiempo para la segunda tecla de `g` + letra. */
const ESPERA_SEGUNDA_TECLA = 1500;

/** Buscador o filtro de la página que enfoca `/`. */
const SELECTOR_BUSCADOR = '#contenido input[type="search"], #contenido input[name="q"], #contenido [data-buscador]';

/**
 * Paleta de comandos y atajos de teclado del panel (HU-DS-05, ADR-0003).
 *
 * - Ctrl/⌘ K abre la paleta desde cualquier lugar, también dentro de un campo.
 * - `?`, `/` y `g` + letra son atajos de una tecla: no se disparan mientras se escribe ni
 *   dentro de un diálogo, y se pueden apagar (WCAG 2.1.4). `[` lo maneja la sidebar.
 */
export function AtajosProvider({
  atajosActivosIniciales = true,
  children,
}: {
  atajosActivosIniciales?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const shell = useShell();
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [paletaCargada, setPaletaCargada] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [atajosActivos, setAtajosActivos] = useState(atajosActivosIniciales);
  const primeraTecla = useRef<{ tecla: string; en: number } | null>(null);

  const secciones = useMemo(
    () => seccionesDePaleta(shell?.permisos, shell?.packs),
    [shell?.permisos, shell?.packs],
  );

  const valor = useMemo<Atajos>(
    () => ({
      abrirPaleta: () => {
        setPaletaCargada(true);
        setPaletaAbierta(true);
      },
      abrirAyuda: () => setAyudaAbierta(true),
      atajosActivos,
      cambiarAtajos: (activos) => {
        document.cookie = cookieAtajos(activos);
        setAtajosActivos(activos);
      },
    }),
    [atajosActivos],
  );

  const alPulsar = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (paletaAbierta) setPaletaAbierta(false);
      else valor.abrirPaleta();
      return;
    }
    if (!atajosActivos || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const destino = e.target as HTMLElement | null;
    if (esCampoEditable(destino) || destino?.closest?.('[role="dialog"], [role="alertdialog"]')) return;

    const anterior = primeraTecla.current;
    primeraTecla.current = null;
    if (anterior?.tecla === "g" && e.timeStamp - anterior.en < ESPERA_SEGUNDA_TECLA) {
      const href = destinoDeAtajo(e.key, secciones);
      if (href) {
        e.preventDefault();
        router.push(href);
      }
      return;
    }
    if (e.key === "g") {
      primeraTecla.current = { tecla: "g", en: e.timeStamp };
    } else if (e.key === "?") {
      e.preventDefault();
      setAyudaAbierta(true);
    } else if (e.key === "/") {
      const buscador = document.querySelector<HTMLElement>(SELECTOR_BUSCADOR);
      if (buscador) {
        e.preventDefault();
        buscador.focus();
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  async function cambiarPausa(pausado: boolean) {
    if (pausado) {
      const ok = await confirm({
        title: "¿Pausar el asistente?",
        description:
          "Dejará de responder a los clientes en todos los canales hasta que lo reactives. Los mensajes se siguen guardando en Conversaciones.",
        confirmLabel: "Pausar asistente",
      });
      if (!ok) return;
    }
    try {
      const res = await fetch("/api/settings/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "No se pudo cambiar el estado del asistente.");
        return;
      }
      toast.success(pausado ? "Asistente pausado. Nadie responde hasta que lo reactives." : "El asistente volvió a responder.");
      router.refresh();
    } catch {
      toast.error("No se pudo contactar el servidor.");
    }
  }

  // La acción elegida corre cuando la paleta terminó de cerrarse y devolvió el foco: así
  // la confirmación de "Pausar asistente" se lo devuelve después al mismo lugar.
  const accionPendiente = useRef<TipoAccion | null>(null);

  function ejecutar(accion: TipoAccion) {
    accionPendiente.current = accion;
    setPaletaAbierta(false);
  }

  function alCerrarPaleta() {
    const accion = accionPendiente.current;
    accionPendiente.current = null;
    if (accion === "pausar-asistente") void cambiarPausa(true);
    else if (accion === "reactivar-asistente") void cambiarPausa(false);
    else if (accion === "cambiar-tema") window.dispatchEvent(new Event(EVENTO_CAMBIAR_TEMA));
    else if (accion === "plegar-menu") window.dispatchEvent(new Event(EVENTO_ALTERNAR_MENU));
    else if (accion === "ayuda-atajos") setAyudaAbierta(true);
    else if (accion === "alternar-atajos") {
      valor.cambiarAtajos(!atajosActivos);
      toast.success(atajosActivos ? "Atajos de una tecla apagados. Ctrl K sigue funcionando." : "Atajos de una tecla encendidos.");
    }
  }

  return (
    <AtajosContext.Provider value={valor}>
      {children}
      {paletaCargada && (
        <PaletaDeComandos
          abierta={paletaAbierta}
          onAbiertaChange={setPaletaAbierta}
          secciones={secciones}
          puedeEditarAsistente={shell?.puedeEditarAsistente ?? false}
          asistentePausado={shell?.asistentePausado ?? false}
          atajosActivos={atajosActivos}
          onAccion={ejecutar}
          onCerrada={alCerrarPaleta}
          onIr={(href) => {
            setPaletaAbierta(false);
            router.push(href);
          }}
        />
      )}
      <AyudaDeAtajos
        abierta={ayudaAbierta}
        onAbiertaChange={setAyudaAbierta}
        atajosActivos={atajosActivos}
        onAtajosChange={valor.cambiarAtajos}
      />
    </AtajosContext.Provider>
  );
}
