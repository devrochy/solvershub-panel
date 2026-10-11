"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  Keyboard,
  Loader2,
  Moon,
  PanelLeft,
  Pause,
  Play,
  Search,
  ToggleLeft,
  type LucideIcon,
} from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import {
  accionesDePaleta,
  filtrar,
  rutaDeResultado,
  type EntradaSeccion,
  type SeccionBusqueda,
  type TipoAccion,
} from "@/lib/shell/paleta";
import { cn } from "@/lib/utils";

const ICONO_ACCION: Record<TipoAccion, LucideIcon> = {
  "pausar-asistente": Pause,
  "reactivar-asistente": Play,
  "cambiar-tema": Moon,
  "plegar-menu": PanelLeft,
  "ayuda-atajos": Keyboard,
  "alternar-atajos": ToggleLeft,
};

/** Espera tras la última tecla antes de buscar registros en el backend. */
const ESPERA_BUSQUEDA = 250;

type Busqueda = { q: string; estado: "listo" | "error"; secciones: SeccionBusqueda[] };

/**
 * Paleta de comandos (HU-DS-05): secciones que el usuario puede ver, acciones rápidas y
 * registros de `GET /search` (ADR-0096). Se carga bajo demanda desde `AtajosProvider`.
 *
 * El filtro es propio (`filtrar`, sin tildes) y no el de `cmdk`: los registros ya llegan
 * filtrados por el backend y pueden coincidir por un dato que no se muestra (el teléfono).
 */
export function PaletaDeComandos({
  abierta,
  onAbiertaChange,
  onCerrada,
  secciones,
  puedeEditarAsistente,
  asistentePausado,
  atajosActivos,
  onIr,
  onAccion,
}: {
  abierta: boolean;
  onAbiertaChange: (abierta: boolean) => void;
  /** Se llama cuando la paleta terminó de cerrarse y devolvió el foco. */
  onCerrada?: () => void;
  secciones: EntradaSeccion[];
  puedeEditarAsistente: boolean;
  asistentePausado: boolean;
  atajosActivos: boolean;
  onIr: (href: string) => void;
  onAccion: (accion: TipoAccion) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [activo, setActivo] = useState("");
  const retornoDeFoco = useRef<HTMLElement | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const q = consulta.trim();

  // `cmdk` 1.1.1 no actualiza `aria-activedescendant` cuando cambia la consulta, así que
  // el lector de pantalla no anunciaba el resultado activo. Se pone a mano tras cada render
  // (la selección es controlada: cada flecha vuelve a renderizar este componente).
  useLayoutEffect(() => {
    const seleccionado = lista.current?.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]');
    if (seleccionado) entrada.current?.setAttribute("aria-activedescendant", seleccionado.id);
    else entrada.current?.removeAttribute("aria-activedescendant");
  });

  useEffect(() => {
    if (q.length < 2) return;
    const control = new AbortController();
    const temporizador = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, { signal: control.signal });
        const json = (await res.json().catch(() => ({}))) as { resultados?: SeccionBusqueda[] };
        setBusqueda({ q, estado: res.ok ? "listo" : "error", secciones: res.ok ? (json.resultados ?? []) : [] });
      } catch {
        if (!control.signal.aborted) setBusqueda({ q, estado: "error", secciones: [] });
      }
    }, ESPERA_BUSQUEDA);
    return () => {
      control.abort();
      window.clearTimeout(temporizador);
    };
  }, [q]);

  const seccionesVisibles = filtrar(secciones, q, (s) => [s.nombre, s.grupo]);
  const acciones = filtrar(
    accionesDePaleta({ puedeEditarAsistente, asistentePausado, atajosActivos }),
    q,
    (a) => [a.label, ...a.palabras],
  );
  // Solo vale la búsqueda de la consulta actual: mientras llega la nueva, "Buscando…".
  const actual = q.length >= 2 && busqueda?.q === q ? busqueda : null;
  const buscando = q.length >= 2 && !actual;
  const registros = (actual?.secciones ?? []).flatMap((s) =>
    s.items.flatMap((item) => {
      const href = rutaDeResultado(item);
      return href ? [{ ...item, href, grupo: s.label, clave: `registro:${s.seccion}:${item.id}` }] : [];
    }),
  );
  const total = seccionesVisibles.length + acciones.length + registros.length;

  function cambiarAbierta(siguiente: boolean) {
    if (!siguiente) setConsulta("");
    onAbiertaChange(siguiente);
  }

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={cambiarAbierta}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            const activo = document.activeElement;
            retornoDeFoco.current = activo instanceof HTMLElement ? activo : null;
          }}
          onCloseAutoFocus={(event) => {
            // Abierta por teclado no hay `Trigger`: el foco vuelve a mano a donde estaba.
            if (retornoDeFoco.current?.isConnected) {
              event.preventDefault();
              retornoDeFoco.current.focus();
            }
            onCerrada?.();
          }}
          className={cn(
            "fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 sm:top-[12vh]",
            "overflow-hidden rounded-lg border border-border bg-surface shadow-elev-3 focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <Command shouldFilter={false} loop label="Paleta de comandos" value={activo} onValueChange={setActivo}>
            {/* El foco se marca con una línea bajo la fila y no con el contorno del campo, que
                montaba un recuadro sobre el borde del diálogo. */}
            <div className="flex items-center gap-3 border-b border-border-soft px-4 focus-within:shadow-[inset_0_-2px_0_var(--color-focus)]">
              {buscando ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-soft motion-reduce:animate-none" aria-hidden />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-text-soft" aria-hidden />
              )}
              <Command.Input
                ref={entrada}
                value={consulta}
                onValueChange={setConsulta}
                placeholder="Busca una sección, una acción o un cliente"
                className="h-12 min-w-0 flex-1 bg-transparent text-sh-body text-headline placeholder:text-text-soft focus-visible:outline-none!"
              />
              <Kbd keys={["Esc"]} className="hidden sm:inline-flex" />
            </div>

            <Command.List
              ref={lista}
              aria-label="Resultados"
              className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2"
            >
              {!buscando && (
                <Command.Empty className="px-3 py-8 text-center text-sh-dense text-body">
                  {actual?.estado === "error"
                    ? "No se pudo buscar en los registros. Revisa tu conexión e inténtalo de nuevo."
                    : `Nada coincide con «${q}». Prueba con otra palabra o con el nombre del cliente.`}
                </Command.Empty>
              )}

              {seccionesVisibles.length > 0 && (
                <Grupo titulo="Ir a">
                  {seccionesVisibles.map((s) => (
                    <Elemento key={s.id} valor={s.id} icono={s.icon} onSelect={() => onIr(s.href)}>
                      <span className="text-text-soft">{s.grupo} › </span>
                      <span className="text-headline">{s.nombre}</span>
                    </Elemento>
                  ))}
                </Grupo>
              )}

              {acciones.length > 0 && (
                <Grupo titulo="Acciones">
                  {acciones.map((a) => (
                    <Elemento key={a.id} valor={`accion:${a.id}`} icono={ICONO_ACCION[a.id]} onSelect={() => onAccion(a.id)}>
                      <span className="text-headline">{a.label}</span>
                    </Elemento>
                  ))}
                </Grupo>
              )}

              {(actual?.secciones ?? []).map((s) => {
                const items = registros.filter((r) => r.grupo === s.label);
                if (items.length === 0) return null;
                return (
                  <Grupo key={s.seccion} titulo={s.label}>
                    {items.map((r) => (
                      <Elemento key={r.clave} valor={r.clave} onSelect={() => onIr(r.href)}>
                        <span className="truncate text-headline">{r.titulo}</span>
                        {r.subtitulo && <span className="ml-2 truncate text-text-soft">{r.subtitulo}</span>}
                      </Elemento>
                    ))}
                  </Grupo>
                );
              })}
            </Command.List>

            {/* Fuera de la lista: un `listbox` solo puede contener opciones y grupos. */}
            {buscando && <p className="px-5 pb-3 text-sh-dense text-text-soft">Buscando en los registros…</p>}

            <p aria-live="polite" className="sr-only">
              {q ? (buscando ? `${total} resultados, buscando más en los registros` : `${total} resultados`) : ""}
            </p>

            <div className="hidden items-center gap-4 border-t border-border-soft px-4 py-2 text-sh-caption text-text-soft sm:flex">
              <span className="flex items-center gap-1.5">
                <Kbd keys={["↑", "↓"]} /> moverse
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd keys={["Enter"]} /> abrir
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd keys={["Esc"]} /> cerrar
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={titulo}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-sh-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-soft"
    >
      {children}
    </Command.Group>
  );
}

function Elemento({
  valor,
  icono: Icono,
  onSelect,
  children,
}: {
  valor: string;
  icono?: LucideIcon;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={valor}
      onSelect={onSelect}
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sh-dense",
        "data-[selected=true]:bg-hover data-[selected=true]:shadow-[inset_3px_0_0_var(--color-focus)]",
      )}
    >
      {Icono && <Icono className="h-4 w-4 shrink-0 text-text-soft" aria-hidden />}
      {/* Sin flex: en un contenedor flex se perdía el espacio después de "›". */}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Command.Item>
  );
}
